const db = require('../../database/db');
const { calculateBookingPrice, diffNights } = require('../../shared/utils/pricing');
const { reserveInventory, releaseInventory } = require('../../shared/utils/availability');
const { annotateAvailability } = require('../room/service');
const { validateAndCalculateDiscount } = require('../../shared/utils/couponEngine');
const { logAction } = require('../../shared/utils/audit');
const { ApiError } = require('../../core/ApiError');
const config = require('../../config');
const logger = require('../../shared/loggers/logger');
const { enqueueEmail, bookingEmailAddress } = require('../../shared/utils/emailOutbox');

const REF_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function makeBookingRef() {
  let ref = 'SF';
  for (let i = 0; i < 6; i++) ref += REF_ALPHABET[Math.floor(Math.random() * REF_ALPHABET.length)];
  return ref;
}

function toInt(value, fallback) {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

async function listMyBookings(customerId) {
  if (!customerId) return [];

  return db('bookings')
    .join('hotels', 'hotels.id', 'bookings.hotel_id')
    .leftJoin('room_types', 'room_types.id', 'bookings.room_type_id')
    .leftJoin('rate_plans', 'rate_plans.id', 'bookings.rate_plan_id')
    .where('bookings.customer_id', customerId)
    // Unpaid checkout holds that lapsed are noise in "My trips".
    .where((qb) => qb.whereNull('bookings.cancellation_reason').orWhereNot('bookings.cancellation_reason', 'Payment not completed'))
    .select(
      'bookings.*',
      'hotels.name as hotel_name',
      'hotels.city as hotel_city',
      'hotels.image_url as hotel_image_url',
      'room_types.name as room_type_name',
      'rate_plans.name as rate_plan_name'
    )
    .orderBy('bookings.check_in', 'desc');
}

async function getBookingById(id, user) {
  const booking = await db('bookings')
    .join('hotels', 'hotels.id', 'bookings.hotel_id')
    .leftJoin('customers', 'customers.id', 'bookings.customer_id')
    .leftJoin('room_types', 'room_types.id', 'bookings.room_type_id')
    .leftJoin('rate_plans', 'rate_plans.id', 'bookings.rate_plan_id')
    .where('bookings.id', id)
    .select(
      'bookings.*',
      'hotels.name as hotel_name',
      'hotels.address as hotel_address',
      'hotels.city as hotel_city',
      'hotels.phone as hotel_phone',
      'hotels.image_url as hotel_image_url',
      'hotels.check_in_time',
      'hotels.check_out_time',
      'hotels.latitude',
      'hotels.longitude',
      'customers.name as customer_name',
      'customers.email as customer_email',
      'customers.phone as customer_phone',
      'room_types.name as room_type_name',
      'rate_plans.name as rate_plan_name',
      'rate_plans.meal_inclusion',
      'rate_plans.refundable'
    )
    .first();

  if (!booking) throw ApiError.notFound('Booking not found');
  if (booking.customer_id !== user.customerId) {
    throw ApiError.forbidden();
  }

  const [payments, refunds, cancellationPolicy] = await Promise.all([
    db('payments').where({ booking_id: booking.id }).orderBy('created_at'),
    db('refunds').where({ booking_id: booking.id }).orderBy('created_at'),
    booking.rate_plan_id
      ? db('cancellation_policies').where({ rate_plan_id: booking.rate_plan_id }).orderBy('days_before_checkin', 'desc')
      : [],
  ]);
  // Signatures are only needed server-side.
  const safePayments = payments.map(({ razorpay_signature, ...p }) => p);
  return { ...booking, payments: safePayments, refunds, cancellationPolicy };
}

/**
 * Validates a stay request against the catalogue (hotel active, room type
 * belongs to it and is active, rate plan belongs to the room type and is
 * active, occupancy fits) and returns the pieces pricing needs.
 */
async function resolveStay({ hotelId, roomTypeId, ratePlanId, checkIn, checkOut, guests, numRooms }) {
  if (!hotelId || !roomTypeId || !ratePlanId || !checkIn || !checkOut) {
    throw ApiError.badRequest('Missing required booking fields');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(checkIn) || !/^\d{4}-\d{2}-\d{2}$/.test(checkOut)) {
    throw ApiError.badRequest('Dates must be in YYYY-MM-DD format');
  }
  if (checkOut <= checkIn) throw ApiError.badRequest('Check-out must be later than check-in');
  if (checkIn < new Date().toISOString().slice(0, 10)) throw ApiError.badRequest('Check-in cannot be in the past');
  if (numRooms < 1 || numRooms > 8) throw ApiError.badRequest('You can book between 1 and 8 rooms');
  if (guests < 1) throw ApiError.badRequest('At least one guest is required');

  const [hotel, roomType, ratePlan] = await Promise.all([
    db('hotels').where({ id: hotelId }).first(),
    db('room_types').where({ id: roomTypeId, hotel_id: hotelId }).first(),
    db('rate_plans').where({ id: ratePlanId, room_type_id: roomTypeId }).first(),
  ]);
  if (!hotel || hotel.status !== 'active') throw ApiError.badRequest('This hotel is not accepting bookings');
  if (!roomType || roomType.status !== 'active') throw ApiError.badRequest('This room is not available');
  if (!ratePlan || ratePlan.status !== 'active') throw ApiError.badRequest('Invalid rate plan for this room type');
  if (guests > roomType.max_occupancy * numRooms) {
    throw ApiError.badRequest(`${roomType.name} fits ${roomType.max_occupancy} guest(s) per room — add another room`);
  }

  return { hotel, roomType, ratePlan, nights: diffNights(checkIn, checkOut) };
}

async function priceStay({ ratePlan, nights, numRooms, couponCode, hotelId, roomTypeId, ratePlanId, customerId }) {
  const base = await calculateBookingPrice({ ratePlanPrice: ratePlan.price, nights, numRooms });
  if (!couponCode) return { pricing: base, coupon: null };

  const result = await validateAndCalculateDiscount({
    code: String(couponCode).trim().toUpperCase(), hotelId, roomTypeId, ratePlanId, customerId, roomPrice: base.roomPrice,
  });
  if (!result.valid) throw ApiError.badRequest(result.message);

  const pricing = await calculateBookingPrice({
    ratePlanPrice: ratePlan.price, nights, numRooms, discountAmount: result.discountAmount,
  });
  return { pricing, coupon: result.coupon };
}

function parseStay(body) {
  return {
    hotelId: toInt(body.hotelId),
    roomTypeId: toInt(body.roomTypeId),
    ratePlanId: toInt(body.ratePlanId),
    checkIn: body.checkIn,
    checkOut: body.checkOut,
    guests: toInt(body.guests, 1),
    numRooms: toInt(body.numRooms, 1),
  };
}

/** Price breakdown for the checkout page — reserves nothing. */
async function quoteBooking(body, user) {
  const stay = parseStay(body);
  const { hotel, roomType, ratePlan, nights } = await resolveStay(stay);

  const [available] = await annotateAvailability([roomType], stay);
  const { pricing, coupon } = await priceStay({
    ratePlan, nights, numRooms: stay.numRooms, couponCode: body.couponCode,
    hotelId: stay.hotelId, roomTypeId: stay.roomTypeId, ratePlanId: stay.ratePlanId, customerId: user?.customerId,
  });

  const cancellationPolicy = await db('cancellation_policies')
    .where({ rate_plan_id: ratePlan.id })
    .orderBy('days_before_checkin', 'desc');

  return {
    available: available.available !== false,
    nights,
    ...stay,
    hotel: { id: hotel.id, name: hotel.name, city: hotel.city, address: hotel.address, image_url: hotel.image_url, star_category: hotel.star_category, check_in_time: hotel.check_in_time, check_out_time: hotel.check_out_time },
    roomType: { id: roomType.id, name: roomType.name, bed_type: roomType.bed_type, max_occupancy: roomType.max_occupancy },
    ratePlan: { id: ratePlan.id, name: ratePlan.name, price: ratePlan.price, meal_inclusion: ratePlan.meal_inclusion, refundable: ratePlan.refundable },
    cancellationPolicy,
    pricing,
    coupon: coupon ? { code: coupon.code, discount_type: coupon.discount_type, discount_value: coupon.discount_value } : null,
  };
}

/**
 * Guests book for themselves (customerId comes from their token). A booking
 * starts as a pending *hold*: inventory is reserved for `bookingHoldMinutes`
 * while they pay, and `expireStaleHolds` releases it if payment never lands.
 */
async function createBooking(body, user) {
  const customerId = user.customerId;
  if (!customerId) throw ApiError.badRequest('Missing customer for this booking');

  const stay = parseStay(body);
  const { ratePlan, nights } = await resolveStay(stay);

  const guestName = String(body.guestName ?? '').trim();
  const guestEmail = String(body.guestEmail ?? '').trim().toLowerCase();
  const guestPhone = String(body.guestPhone ?? '').replace(/[^\d+]/g, '');
  if (guestName.length < 2) throw ApiError.badRequest('Please enter the lead guest\'s full name');
  if (!EMAIL_RE.test(guestEmail)) throw ApiError.badRequest('Please enter a valid email address');
  if (!/^\+?\d{10,13}$/.test(guestPhone)) throw ApiError.badRequest('Please enter a valid mobile number');

  const { pricing, coupon } = await priceStay({
    ratePlan, nights, numRooms: stay.numRooms, couponCode: body.couponCode,
    hotelId: stay.hotelId, roomTypeId: stay.roomTypeId, ratePlanId: stay.ratePlanId, customerId,
  });

  let booking;
  try {
    booking = await db.transaction(async (trx) => {
      await reserveInventory(trx, stay.roomTypeId, stay.checkIn, stay.checkOut, stay.numRooms);

      const [row] = await trx('bookings')
        .insert({
          booking_ref: makeBookingRef(),
          customer_id: customerId,
          hotel_id: stay.hotelId,
          room_type_id: stay.roomTypeId,
          rate_plan_id: stay.ratePlanId,
          check_in: stay.checkIn,
          check_out: stay.checkOut,
          guests: stay.guests,
          num_rooms: stay.numRooms,
          nights,
          room_price: pricing.roomPrice,
          tax_amount: pricing.taxAmount,
          fee_amount: pricing.feeAmount,
          discount_amount: pricing.discountAmount,
          total_amount: pricing.totalAmount,
          coupon_id: coupon?.id ?? null,
          guest_name: guestName || null,
          guest_email: guestEmail || null,
          guest_phone: guestPhone || null,
          special_requests: body.specialRequests ? String(body.specialRequests).slice(0, 1000) : null,
          hold_expires_at: new Date(Date.now() + config.bookingHoldMinutes * 60 * 1000),
          booking_status: 'pending',
          payment_status: 'pending',
        })
        .returning('*');

      if (coupon) {
        await trx('coupon_usages').insert({ coupon_id: coupon.id, customer_id: customerId, booking_id: row.id });
      }
      return row;
    });
  } catch (err) {
    if (err instanceof ApiError) throw err;
    // reserveInventory throws plain Errors for sold-out nights.
    throw ApiError.conflict(err.message || 'Unable to create booking');
  }

  await logAction({
    adminUserId: null, action: 'booking.created', entityType: 'booking', entityId: booking.id, after: booking,
  });
  return booking;
}

/**
 * Releases rooms held by guest checkouts whose payment window lapsed.
 * Only touches bookings created with a hold (hold_expires_at set), so
 * admin-created and legacy pending bookings are never auto-cancelled.
 */
async function expireStaleHolds() {
  const stale = await db('bookings')
    .where('booking_status', 'pending')
    .whereNot('payment_status', 'captured')
    .whereNotNull('hold_expires_at')
    .where('hold_expires_at', '<', db.fn.now())
    .select('id');

  for (const { id } of stale) {
    await db.transaction(async (trx) => {
      const booking = await trx('bookings').where({ id }).forUpdate().first();
      if (!booking || booking.booking_status !== 'pending' || booking.payment_status === 'captured') return;
      await releaseInventory(trx, booking.room_type_id, booking.check_in, booking.check_out, booking.num_rooms);
      await trx('coupon_usages').where({ booking_id: booking.id }).del();
      await trx('bookings').where({ id }).update({
        booking_status: 'cancelled',
        cancellation_reason: 'Payment not completed',
        cancelled_at: db.fn.now(),
      });
      await enqueueEmail(trx, {
        templateKey: 'booking_hold_expired',
        to: await bookingEmailAddress(trx, booking),
        data: { bookingId: id },
        entityType: 'booking',
        entityId: id,
      });
    });
  }
  if (stale.length) logger.info(`Released ${stale.length} expired booking hold(s)`);
  return stale.length;
}

module.exports = { listMyBookings, getBookingById, quoteBooking, createBooking, expireStaleHolds };
