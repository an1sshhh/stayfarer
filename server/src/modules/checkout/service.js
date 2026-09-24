const db = require('../../database/db');
const config = require('../../config');
const logger = require('../../shared/loggers/logger');
const { ApiError } = require('../../core/ApiError');
const { reserveInventory } = require('../../shared/utils/availability');
const razorpay = require('../../shared/utils/razorpay');
const bookingService = require('../booking/service');
const { enqueueEmail, enqueueAdminEmail, bookingEmailAddress } = require('../../shared/utils/emailOutbox');

const EXPIRED_REASON = 'Payment not completed';

async function publicConfig() {
  // Percentage taxes only: used for "+ ₹X taxes" hints; the checkout quote is the exact figure.
  const taxes = await db('tax_rules').where({ active: true, value_type: 'percentage' }).sum('value as total').first();
  return {
    enabled: razorpay.isConfigured(),
    razorpayKeyId: config.razorpay.keyId || null,
    holdMinutes: config.bookingHoldMinutes,
    taxPercent: Number(taxes?.total || 0),
  };
}

async function notify(trx, { type, title, message, bookingId }) {
  await trx('notifications').insert({
    type, title, message, related_entity_type: 'booking', related_entity_id: String(bookingId),
  });
}

async function loadOwnBooking(bookingId, user) {
  const booking = await db('bookings').where({ id: bookingId }).first();
  if (!booking) throw ApiError.notFound('Booking not found');
  if (booking.customer_id !== user.customerId) throw ApiError.forbidden();
  return booking;
}

/**
 * Creates (or reuses) a Razorpay order for a pending booking and returns
 * what the browser needs to open Razorpay Checkout. The amount always comes
 * from the booking row the server priced, never from the client.
 */
async function createPaymentOrder(bookingId, user) {
  const booking = await loadOwnBooking(bookingId, user);
  if (booking.payment_status === 'captured') throw ApiError.conflict('This booking is already paid');
  if (booking.booking_status !== 'pending') throw ApiError.conflict('This booking can no longer be paid for');
  if (booking.hold_expires_at && new Date(booking.hold_expires_at) < new Date()) {
    throw ApiError.conflict('Your room hold has expired. Please search again to book.');
  }

  const amountPaise = razorpay.toPaise(booking.total_amount);
  let payment = await db('payments')
    .where({ booking_id: booking.id, gateway: 'razorpay', status: 'pending' })
    .orderBy('created_at', 'desc')
    .first();

  if (!payment || razorpay.toPaise(payment.amount) !== amountPaise) {
    const order = await razorpay.getClient().orders.create({
      amount: amountPaise,
      currency: 'INR',
      receipt: booking.booking_ref,
      notes: { booking_id: String(booking.id), booking_ref: booking.booking_ref },
    });
    [payment] = await db('payments')
      .insert({
        booking_id: booking.id,
        customer_id: booking.customer_id,
        amount: booking.total_amount,
        currency: 'INR',
        status: 'pending',
        gateway: 'razorpay',
        razorpay_order_id: order.id,
        gateway_ref: order.id,
      })
      .returning('*');
  }

  const hotel = await db('hotels').where({ id: booking.hotel_id }).select('name').first();
  return {
    keyId: config.razorpay.keyId,
    orderId: payment.razorpay_order_id,
    amount: amountPaise,
    currency: 'INR',
    bookingId: booking.id,
    bookingRef: booking.booking_ref,
    holdExpiresAt: booking.hold_expires_at,
    description: `${hotel?.name ?? 'Hotel stay'} · ${booking.booking_ref}`,
    prefill: { name: booking.guest_name, email: booking.guest_email, contact: booking.guest_phone },
  };
}

/** Holds the rooms and opens a payment order in one step for the checkout page. */
async function startCheckout(body, user) {
  if (!razorpay.isConfigured()) {
    throw ApiError.unavailable('Online payments are not configured yet. Please try again later.');
  }
  const booking = await bookingService.createBooking(body, user);
  try {
    return { booking: { id: booking.id, booking_ref: booking.booking_ref }, payment: await createPaymentOrder(booking.id, user) };
  } catch (err) {
    // The hold stays; the guest can retry payment from the booking page until it lapses.
    logger.error(`Could not open Razorpay order for booking ${booking.id}: ${err.message}`);
    throw ApiError.unavailable('We held your room but could not start the payment. Please retry from My Trips.', 502);
  }
}

/**
 * Marks a Razorpay payment captured and confirms its booking. Shared by the
 * browser handler (after signature check) and the webhook, and idempotent,
 * so whichever arrives second is a no-op. If the hold already lapsed, it
 * tries to re-reserve the rooms; if they're gone, the money is flagged for
 * an admin refund instead of silently confirming an oversold room.
 */
async function confirmCapturedPayment({ orderId, paymentId, signature, method, amountPaise }) {
  const outcome = await db.transaction(async (trx) => {
    const payment = await trx('payments').where({ razorpay_order_id: orderId }).forUpdate().first();
    if (!payment) throw ApiError.notFound('Unknown payment order');
    if (payment.status === 'captured') return { bookingId: payment.booking_id, alreadyDone: true };
    if (amountPaise != null && Number(amountPaise) !== razorpay.toPaise(payment.amount)) {
      throw ApiError.badRequest('Paid amount does not match the order');
    }

    const booking = await trx('bookings').where({ id: payment.booking_id }).forUpdate().first();

    await trx('payments').where({ id: payment.id }).update({
      status: 'captured',
      razorpay_payment_id: paymentId,
      razorpay_signature: signature ?? payment.razorpay_signature,
      transaction_ref: paymentId,
      method: method ?? payment.method,
      captured_at: trx.fn.now(),
      failure_reason: null,
      updated_at: trx.fn.now(),
    });

    let confirmed = booking.booking_status === 'pending';
    if (!confirmed && booking.booking_status === 'cancelled' && booking.cancellation_reason === EXPIRED_REASON) {
      try {
        await trx.transaction((sp) => reserveInventory(sp, booking.room_type_id, booking.check_in, booking.check_out, booking.num_rooms));
        confirmed = true;
      } catch {
        confirmed = false;
      }
    }

    if (confirmed) {
      await trx('bookings').where({ id: booking.id }).update({
        booking_status: 'confirmed',
        payment_status: 'captured',
        hold_expires_at: null,
        cancellation_reason: null,
        cancelled_at: null,
        updated_at: trx.fn.now(),
      });
      await notify(trx, {
        type: 'new_booking',
        title: `New booking ${booking.booking_ref}`,
        message: `₹${booking.total_amount} paid online for ${booking.nights} night(s), check-in ${booking.check_in}.`,
        bookingId: booking.id,
      });
      const entity = { data: { bookingId: booking.id }, entityType: 'booking', entityId: booking.id };
      await enqueueEmail(trx, { templateKey: 'booking_confirmed', to: await bookingEmailAddress(trx, booking), ...entity });
      await enqueueAdminEmail(trx, { templateKey: 'admin_new_booking', ...entity });
    } else {
      await trx('bookings').where({ id: booking.id }).update({ payment_status: 'captured', updated_at: trx.fn.now() });
      await notify(trx, {
        type: 'refund_request',
        title: `Refund needed for ${booking.booking_ref}`,
        message: `Payment ${paymentId} arrived after the room hold lapsed and the room is no longer available. Refund ₹${payment.amount} from the booking page.`,
        bookingId: booking.id,
      });
      await enqueueAdminEmail(trx, {
        templateKey: 'admin_refund_required',
        data: { bookingId: booking.id, amount: `₹${Number(payment.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, payment_id: paymentId },
        entityType: 'booking',
        entityId: booking.id,
      });
    }
    return { bookingId: booking.id, confirmed };
  });
  return outcome;
}

/** Browser handler callback: verify Razorpay's signature, make sure the money is captured, confirm. */
async function verifyPayment(body, user) {
  const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = body;
  if (!orderId || !paymentId || !signature) throw ApiError.badRequest('Missing payment confirmation fields');

  const payment = await db('payments').where({ razorpay_order_id: orderId }).first();
  if (!payment) throw ApiError.notFound('Unknown payment order');
  await loadOwnBooking(payment.booking_id, user);

  if (!razorpay.verifyPaymentSignature({ orderId, paymentId, signature })) {
    await db('payments').where({ id: payment.id, status: 'pending' }).update({ failure_reason: 'Signature verification failed' });
    throw ApiError.badRequest('Payment verification failed');
  }

  let method = null;
  try {
    const client = razorpay.getClient();
    const remote = await client.payments.fetch(paymentId);
    method = remote.method;
    if (remote.order_id !== orderId) throw ApiError.badRequest('Payment does not belong to this order');
    if (remote.status === 'authorized') await client.payments.capture(paymentId, remote.amount, remote.currency);
  } catch (err) {
    if (err instanceof ApiError) throw err;
    // Signature already proves Razorpay accepted the payment; the webhook reconciles any capture hiccup.
    logger.error(`Razorpay fetch/capture failed for ${paymentId}: ${err.message || err.error?.description}`);
  }

  await confirmCapturedPayment({ orderId, paymentId, signature, method });
  return bookingService.getBookingById(payment.booking_id, user);
}

async function markPaymentFailed({ orderId, paymentId, reason }) {
  await db('payments')
    .where({ razorpay_order_id: orderId, status: 'pending' })
    .update({ failure_reason: reason || 'Payment failed', razorpay_payment_id: paymentId ?? null, updated_at: db.fn.now() });
}

/** The guest's browser reports a failed attempt; the hold stays so they can retry. */
async function reportPaymentFailure(bookingId, body, user) {
  await loadOwnBooking(bookingId, user);
  const orderId = body.razorpay_order_id;
  if (orderId) {
    const payment = await db('payments').where({ razorpay_order_id: orderId, booking_id: bookingId }).first();
    if (payment) await markPaymentFailed({ orderId, paymentId: body.razorpay_payment_id, reason: body.reason });
  }
}

async function handleWebhook(rawBody, signature) {
  if (!razorpay.verifyWebhookSignature(rawBody, signature)) throw ApiError.unauthorized('Invalid webhook signature');
  const event = JSON.parse(rawBody.toString('utf8'));
  const payment = event.payload?.payment?.entity;
  const refund = event.payload?.refund?.entity;

  switch (event.event) {
    case 'payment.captured':
    case 'order.paid':
      if (payment?.order_id) {
        await confirmCapturedPayment({ orderId: payment.order_id, paymentId: payment.id, method: payment.method, amountPaise: payment.amount });
      }
      break;
    case 'payment.failed':
      if (payment?.order_id) await markPaymentFailed({ orderId: payment.order_id, paymentId: payment.id, reason: payment.error_description });
      break;
    case 'refund.processed':
    case 'refund.failed':
      if (refund?.id) {
        const processed = event.event === 'refund.processed';
        await db.transaction(async (trx) => {
          const [row] = await trx('refunds')
            .where({ gateway_refund_id: refund.id })
            .whereNot({ status: processed ? 'completed' : 'failed' })
            .update({ status: processed ? 'completed' : 'failed', processed_at: trx.fn.now(), updated_at: trx.fn.now() })
            .returning('*');
          // Only on the first transition, so webhook retries don't email twice.
          if (row && processed && row.booking_id) {
            const booking = await trx('bookings').where({ id: row.booking_id }).first();
            await enqueueEmail(trx, {
              templateKey: 'refund_processed',
              to: booking && (await bookingEmailAddress(trx, booking)),
              data: {
                bookingId: row.booking_id,
                refund_amount: `₹${Number(row.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
                refund_id: refund.id,
              },
              entityType: 'booking',
              entityId: row.booking_id,
            });
          }
        });
      }
      break;
    default:
      break;
  }
  return { received: true };
}

module.exports = {
  publicConfig, startCheckout, createPaymentOrder, verifyPayment, reportPaymentFailure, handleWebhook,
};
