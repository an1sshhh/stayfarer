const db = require('../../database/db');
const { ApiError } = require('../../core/ApiError');

async function listPayments(status) {
  let query = db('payments')
    .join('bookings', 'bookings.id', 'payments.booking_id')
    .leftJoin('customers', 'customers.id', 'payments.customer_id')
    .leftJoin('hotels', 'hotels.id', 'bookings.hotel_id')
    .select('payments.*', 'customers.name as customer_name', 'hotels.name as hotel_name');

  if (status) query = query.where('payments.status', status);
  return query.orderBy('payments.created_at', 'desc');
}

async function getPaymentById(id) {
  const payment = await db('payments').where({ id }).first();
  if (!payment) throw ApiError.notFound('Payment not found');
  const refunds = await db('refunds').where({ payment_id: payment.id });
  return { ...payment, refunds };
}

async function createRefund(paymentId, { amount, reason }) {
  const payment = await db('payments').where({ id: paymentId }).first();
  if (!payment) throw ApiError.notFound('Payment not found');
  if (payment.status !== 'captured' && payment.status !== 'partially_refunded') {
    throw ApiError.badRequest('Only captured payments can be refunded');
  }

  const existingRefunds = await db('refunds').where({ payment_id: payment.id, status: 'completed' }).sum('amount as total');
  const alreadyRefunded = Number(existingRefunds[0].total || 0);
  if (alreadyRefunded + Number(amount) > Number(payment.amount)) {
    throw ApiError.badRequest('Refund amount exceeds captured payment amount');
  }

  return db.transaction(async (trx) => {
    const [row] = await trx('refunds')
      .insert({ payment_id: payment.id, booking_id: payment.booking_id, amount, reason, status: 'pending' })
      .returning('*');

    const newTotal = alreadyRefunded + Number(amount);
    const paymentStatus = newTotal >= Number(payment.amount) ? 'refunded' : 'partially_refunded';
    await trx('payments').where({ id: payment.id }).update({ status: paymentStatus });
    await trx('bookings').where({ id: payment.booking_id }).update({ payment_status: paymentStatus });

    return row;
  });
}

async function updateRefundStatus(id, status) {
  if (!['pending', 'processing', 'completed', 'failed'].includes(status)) {
    throw ApiError.badRequest('Invalid refund status');
  }
  const [refund] = await db('refunds').where({ id }).update({ status }).returning('*');
  if (!refund) throw ApiError.notFound('Refund not found');
  return refund;
}

module.exports = { listPayments, getPaymentById, createRefund, updateRefundStatus };
