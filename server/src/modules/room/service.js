const db = require('../../database/db');
const { ApiError } = require('../../core/ApiError');
const { dateRange } = require('../../shared/utils/availability');

/**
 * Marks each room type with whether it has enough free inventory for
 * `numRooms` on every night of [checkIn, checkOut). Mirrors the check
 * `reserveInventory` makes at booking time, so a room shown as available
 * here will actually book.
 */
async function annotateAvailability(roomTypes, { checkIn, checkOut, numRooms = 1 }) {
  const dates = dateRange(checkIn, checkOut);
  if (dates.length === 0 || roomTypes.length === 0) {
    return roomTypes.map((r) => ({ ...r, available: null }));
  }

  const rows = await db('room_inventory')
    .whereIn('room_type_id', roomTypes.map((r) => r.id))
    .whereIn('date', dates)
    .andWhereRaw('total - booked - blocked >= ?', [numRooms])
    .groupBy('room_type_id')
    .havingRaw('count(distinct date) = ?', [dates.length])
    .select('room_type_id');

  const availableIds = new Set(rows.map((r) => r.room_type_id));
  return roomTypes.map((r) => ({ ...r, available: availableIds.has(r.id) }));
}

function groupBy(rows, key) {
  const out = {};
  for (const row of rows) (out[row[key]] ??= []).push(row);
  return out;
}

/**
 * Everything the public hotel page needs to render its room/rate table in
 * one call: active room types with images, amenities, active rate plans
 * (inclusions + cancellation slabs) and — when dates are given — whether
 * each room has `rooms` free units on every night of the stay.
 */
async function listRoomOffers(hotelId, { checkIn, checkOut, guests, rooms } = {}) {
  const numRooms = Math.max(1, Number.parseInt(rooms, 10) || 1);
  let roomTypes = await db('room_types').where({ hotel_id: hotelId, status: 'active' }).orderBy('created_at');
  if (!roomTypes.length) return [];

  const ids = roomTypes.map((r) => r.id);
  const [images, amenities, ratePlans] = await Promise.all([
    db('room_images').whereIn('room_type_id', ids).orderBy('sort_order'),
    db('room_amenities')
      .join('amenities', 'amenities.id', 'room_amenities.amenity_id')
      .whereIn('room_amenities.room_type_id', ids)
      .select('room_amenities.room_type_id', 'amenities.id', 'amenities.name'),
    db('rate_plans').whereIn('room_type_id', ids).where({ status: 'active' }).orderBy('price'),
  ]);

  const planIds = ratePlans.map((p) => p.id);
  const [inclusions, policies] = planIds.length
    ? await Promise.all([
        db('rate_plan_inclusions').whereIn('rate_plan_id', planIds),
        db('cancellation_policies').whereIn('rate_plan_id', planIds).orderBy('days_before_checkin', 'desc'),
      ])
    : [[], []];

  const inclusionsByPlan = groupBy(inclusions, 'rate_plan_id');
  const policiesByPlan = groupBy(policies, 'rate_plan_id');
  const plansByRoom = groupBy(
    ratePlans.map((p) => ({
      ...p,
      inclusions: (inclusionsByPlan[p.id] || []).map((i) => i.label),
      cancellationPolicy: policiesByPlan[p.id] || [],
    })),
    'room_type_id'
  );
  const imagesByRoom = groupBy(images, 'room_type_id');
  const amenitiesByRoom = groupBy(amenities, 'room_type_id');

  roomTypes = roomTypes
    .map((r) => ({
      ...r,
      images: imagesByRoom[r.id] || [],
      amenities: (amenitiesByRoom[r.id] || []).map(({ id, name }) => ({ id, name })),
      ratePlans: plansByRoom[r.id] || [],
      fitsGuests: guests ? r.max_occupancy * numRooms >= Number(guests) : true,
    }))
    .filter((r) => r.ratePlans.length > 0);

  if (checkIn && checkOut) {
    roomTypes = await annotateAvailability(roomTypes, { checkIn, checkOut, numRooms });
  }
  return roomTypes;
}

module.exports = { annotateAvailability, listRoomOffers };
