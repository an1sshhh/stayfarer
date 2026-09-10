const db = require('../../database/db');
const { calculateBookingPrice, diffNights } = require('../../shared/utils/pricing');
const { reserveInventory, releaseInventory } = require('../../shared/utils/availability');
const { validateAndCalculateDiscount } = require('../../shared/utils/couponEngine');
const { logAction } = require('../../shared/utils/audit');
const { ApiError } = require('../../core/ApiError');

// Valid booking_status transitions an admin can trigger.
const ALLOWED_TRANSITIONS = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['checked_in', 'cancelled'],
  checked_in: ['checked_out'],
  checked_out: [],
  cancelled: [],
  refunded: [],
};

async function listBookings({ status, paymentStatus, hotelId, search, from, to, page = 1, pageSize = 20 }) {
  let query = db('bookings')
    .join('hotels', 'hotels.id', 'bookings.hotel_id')
    .leftJoin('customers', 'customers.id', 'bookings.customer_id')
    .leftJoin('room_types', 'room_types.id', 'bookings.room_type_id')
    .select(
      'bookings.*',
      'hotels.name as hotel_name',
      'customers.name as customer_name',
      'customers.email as customer_email',
      'room_types.name as room_type_name'
    );

  if (status) query = query.where('bookings.booking_status', status);
  if (paymentStatus) query = query.where('bookings.payment_status', paymentStatus);
  if (hotelId) query = query.where('bookings.hotel_id', hotelId);
  if (from) query = query.where('bookings.check_in', '>=', from);
  if (to) query = query.where('bookings.check_out', '<=', to);
  if (search) {
    query = query.where((qb) => {
      qb.whereRaw('bookings.id::text ilike ?', [`%${search}%`]).orWhereILike('customers.name', `%${search}%`);
    });
  }

  const total = await query.clone().clearSelect().count({ count: 'bookings.id' }).first();
  const bookings = await query
    .orderBy('bookings.created_at', 'desc')
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return { data: bookings, total: Number(total.count), page: Number(page), pageSize: Number(pageSize) };
}

async function listMyBookings(customerId) {
  if (!customerId) return [];

  return db('bookings')
    .join('hotels', 'hotels.id', 'bookings.hotel_id')
    .leftJoin('room_types', 'room_types.id', 'bookings.room_type_id')
    .where('bookings.customer_id', customerId)
    .select('bookings.*', 'hotels.name as hotel_name', 'room_types.name as room_type_name')
    .orderBy('bookings.created_at', 'desc');
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
      'customers.name as customer_name',
      'customers.email as customer_email',
      'customers.phone as customer_phone',
      'room_types.name as room_type_name',
      'rate_plans.name as rate_plan_name'
    )
    .first();

  if (!booking) throw ApiError.notFound('Booking not found');
  if (user.role !== 'admin' && booking.customer_id !== user.customerId) {
    throw ApiError.forbidden();
  }

  const payments = await db('payments').where({ booking_id: booking.id });
  return { ...booking, payments };
}

// Guests book for themselves (customerId comes from their token); admins may book on behalf of a walk-in customer.
async function createBooking(body, user) {
  const { hotelId, roomTypeId, ratePlanId, checkIn, checkOut, guests = 1, numRooms = 1, couponCode } = body;
  const customerId = user.role === 'admin' ? body.customerId : user.customerId;

  if (!customerId || !hotelId || !roomTypeId || !ratePlanId || !checkIn || !checkOut) {
    throw ApiError.badRequest('Missing required booking fields');
  }
  if (new Date(checkOut) <= new Date(checkIn)) {
    throw ApiError.badRequest('Check-out must be later than check-in');
  }

  const ratePlan = await db('rate_plans').where({ id: ratePlanId, room_type_id: roomTypeId }).first();
  if (!ratePlan) throw ApiError.badRequest('Invalid rate plan for this room type');

  const nights = diffNights(checkIn, checkOut);

  try {
    const booking = await db.transaction(async (trx) => {
      await reserveInventory(trx, roomTypeId, checkIn, checkOut, numRooms);

      const { roomPrice } = await calculateBookingPrice({ ratePlanPrice: ratePlan.price, nights, numRooms });

      let discountAmount = 0;
      let couponId = null;
      if (couponCode) {
        const result = await validateAndCalculateDiscount({
          code: couponCode, hotelId, roomTypeId, ratePlanId, customerId, roomPrice,
        });
        if (!result.valid) throw new Error(result.message);
        discountAmount = result.discountAmount;
        couponId = result.coupon.id;
      }

      const pricing = await calculateBookingPrice({ ratePlanPrice: ratePlan.price, nights, numRooms, discountAmount });

      const [row] = await trx('bookings')
        .insert({
          customer_id: customerId,
          hotel_id: hotelId,
          room_type_id: roomTypeId,
          rate_plan_id: ratePlanId,
          check_in: checkIn,
          check_out: checkOut,
          guests,
          num_rooms: numRooms,
          nights,
          room_price: pricing.roomPrice,
          tax_amount: pricing.taxAmount,
          fee_amount: pricing.feeAmount,
          discount_amount: pricing.discountAmount,
          total_amount: pricing.totalAmount,
          coupon_id: couponId,
          booking_status: 'pending',
          payment_status: 'pending',
        })
        .returning('*');

      if (couponId) {
        await trx('coupon_usages').insert({ coupon_id: couponId, customer_id: customerId, booking_id: row.id });
      }

      return row;
    });

    await logAction({ adminUserId: user.sub, action: 'booking.created', entityType: 'booking', entityId: booking.id, after: booking });
    return booking;
  } catch (err) {
    throw ApiError.conflict(err.message || 'Unable to create booking');
  }
}

async function updateBookingStatus(id, status, adminUserId) {
  const booking = await db('bookings').where({ id }).first();
  if (!booking) throw ApiError.notFound('Booking not found');

  const allowed = ALLOWED_TRANSITIONS[booking.booking_status] || [];
  if (!allowed.includes(status)) {
    throw ApiError.badRequest(`Cannot move booking from ${booking.booking_status} to ${status}`);
  }

  const updated = await db.transaction(async (trx) => {
    if (status === 'cancelled') {
      await releaseInventory(trx, booking.room_type_id, booking.check_in, booking.check_out, booking.num_rooms);
    }
    const [row] = await trx('bookings').where({ id }).update({ booking_status: status }).returning('*');
    return row;
  });

  await logAction({
    adminUserId, action: `booking.${status}`, entityType: 'booking', entityId: booking.id,
    before: { booking_status: booking.booking_status }, after: { booking_status: status },
  });

  return updated;
}

module.exports = { listBookings, listMyBookings, getBookingById, createBooking, updateBookingStatus };
