const db = require('../../database/db');

function dateFilter(query, column, from, to) {
  if (from) query = query.where(column, '>=', from);
  if (to) query = query.where(column, '<=', to);
  return query;
}

async function getRevenueReport({ from, to }) {
  let query = db('bookings').whereNotIn('booking_status', ['cancelled']);
  query = dateFilter(query, 'created_at', from, to);

  return query
    .select(db.raw('date(created_at) as date'), db.raw('sum(total_amount) as revenue'), db.raw('count(*) as bookings'))
    .groupByRaw('date(created_at)')
    .orderBy('date');
}

async function getBookingsReport({ from, to }) {
  let query = db('bookings');
  query = dateFilter(query, 'created_at', from, to);

  return query.select('booking_status').count({ count: '*' }).groupBy('booking_status');
}

async function getHotelPerformance() {
  return db('bookings')
    .join('hotels', 'hotels.id', 'bookings.hotel_id')
    .whereNotIn('bookings.booking_status', ['cancelled'])
    .select('hotels.id', 'hotels.name')
    .sum('bookings.total_amount as revenue')
    .count('bookings.id as bookings')
    .groupBy('hotels.id', 'hotels.name')
    .orderBy('revenue', 'desc');
}

async function getRoomPerformance() {
  return db('bookings')
    .join('room_types', 'room_types.id', 'bookings.room_type_id')
    .whereNotIn('bookings.booking_status', ['cancelled'])
    .select('room_types.id', 'room_types.name')
    .sum('bookings.total_amount as revenue')
    .count('bookings.id as bookings')
    .groupBy('room_types.id', 'room_types.name')
    .orderBy('revenue', 'desc');
}

async function getCustomerReport() {
  return db('bookings')
    .join('customers', 'customers.id', 'bookings.customer_id')
    .whereNotIn('bookings.booking_status', ['cancelled'])
    .select('customers.id', 'customers.name', 'customers.email')
    .sum('bookings.total_amount as total_spent')
    .count('bookings.id as bookings')
    .groupBy('customers.id', 'customers.name', 'customers.email')
    .orderBy('total_spent', 'desc')
    .limit(50);
}

async function getCouponUsageReport() {
  return db('coupon_usages')
    .join('coupons', 'coupons.id', 'coupon_usages.coupon_id')
    .select('coupons.id', 'coupons.code')
    .count('coupon_usages.id as uses')
    .groupBy('coupons.id', 'coupons.code')
    .orderBy('uses', 'desc');
}

async function getCancellationReport() {
  const totals = await db('bookings').select('booking_status').count({ count: '*' }).groupBy('booking_status');
  const total = totals.reduce((sum, r) => sum + Number(r.count), 0);
  const cancelled = Number(totals.find((r) => r.booking_status === 'cancelled')?.count || 0);
  return { total, cancelled, rate: total ? Math.round((cancelled / total) * 10000) / 100 : 0 };
}

module.exports = {
  getRevenueReport,
  getBookingsReport,
  getHotelPerformance,
  getRoomPerformance,
  getCustomerReport,
  getCouponUsageReport,
  getCancellationReport,
};
