const db = require('../../database/db');
const { ApiError } = require('../../core/ApiError');

const ROOM_FIELDS = [
  'name', 'description', 'size_label', 'bed_type',
  'max_adults', 'max_children', 'max_occupancy', 'room_view',
  'total_rooms', 'status',
];

function pickFields(body, fields) {
  const result = {};
  for (const field of fields) {
    if (body[field] !== undefined) result[field] = body[field];
  }
  return result;
}

async function listRoomTypesByHotel(hotelId) {
  return db('room_types').where({ hotel_id: hotelId }).orderBy('created_at');
}

async function getRoomTypeById(id) {
  const roomType = await db('room_types').where({ id }).first();
  if (!roomType) throw ApiError.notFound('Room type not found');

  const images = await db('room_images').where({ room_type_id: roomType.id }).orderBy('sort_order');
  const amenities = await db('room_amenities')
    .join('amenities', 'amenities.id', 'room_amenities.amenity_id')
    .where('room_amenities.room_type_id', roomType.id)
    .select('amenities.id', 'amenities.name');
  const ratePlans = await db('rate_plans').where({ room_type_id: roomType.id });

  return { ...roomType, images, amenities, ratePlans };
}

async function getInventory(roomTypeId, { from, to }) {
  let query = db('room_inventory').where({ room_type_id: roomTypeId });
  if (from) query = query.andWhere('date', '>=', from);
  if (to) query = query.andWhere('date', '<=', to);
  const rows = await query.orderBy('date');
  return rows.map((r) => ({ ...r, available: r.total - r.booked - r.blocked }));
}

async function createRoomType(hotelId, body) {
  const { name, total_rooms } = body;
  if (!name) throw ApiError.badRequest('Room name is required');
  if (total_rooms !== undefined && Number(total_rooms) < 0) {
    throw ApiError.badRequest('Total rooms must be >= 0');
  }

  const data = pickFields(body, ROOM_FIELDS);
  const [roomType] = await db('room_types')
    .insert({ ...data, hotel_id: hotelId })
    .returning('*');

  return roomType;
}

async function updateRoomType(id, body) {
  const existing = await db('room_types').where({ id }).first();
  if (!existing) throw ApiError.notFound('Room type not found');

  const data = pickFields(body, ROOM_FIELDS);
  const [roomType] = await db('room_types').where({ id }).update(data).returning('*');
  return roomType;
}

// Soft delete: keep the row so historical bookings still resolve.
async function deactivateRoomType(id) {
  const existing = await db('room_types').where({ id }).first();
  if (!existing) throw ApiError.notFound('Room type not found');

  await db('room_types').where({ id }).update({ status: 'inactive' });
}

async function addRoomImage(roomTypeId, file, category = 'other') {
  const [{ maxOrder }] = await db('room_images').where({ room_type_id: roomTypeId }).max('sort_order as maxOrder');

  const [image] = await db('room_images')
    .insert({
      room_type_id: roomTypeId,
      url: `/uploads/${file.filename}`,
      category,
      sort_order: (maxOrder ?? -1) + 1,
    })
    .returning('*');

  return image;
}

async function setPrimaryImage(roomTypeId, imageId) {
  await db('room_images').where({ room_type_id: roomTypeId }).update({ is_primary: false });
  const [image] = await db('room_images')
    .where({ id: imageId, room_type_id: roomTypeId })
    .update({ is_primary: true })
    .returning('*');

  if (!image) throw ApiError.notFound('Image not found');
  return image;
}

async function deleteImage(roomTypeId, imageId) {
  const deleted = await db('room_images').where({ id: imageId, room_type_id: roomTypeId }).del();
  if (!deleted) throw ApiError.notFound('Image not found');
}

async function updateAmenities(roomTypeId, amenityIds = []) {
  await db.transaction(async (trx) => {
    await trx('room_amenities').where({ room_type_id: roomTypeId }).del();
    if (amenityIds.length) {
      await trx('room_amenities').insert(
        amenityIds.map((amenityId) => ({ room_type_id: roomTypeId, amenity_id: amenityId }))
      );
    }
  });

  return db('room_amenities')
    .join('amenities', 'amenities.id', 'room_amenities.amenity_id')
    .where('room_amenities.room_type_id', roomTypeId)
    .select('amenities.id', 'amenities.name');
}

async function updateInventory(roomTypeId, dates) {
  if (!Array.isArray(dates)) throw ApiError.badRequest('dates array is required');

  for (const entry of dates) {
    if (Number(entry.total) < 0) throw ApiError.badRequest('Inventory total must be >= 0');
  }

  await db.transaction(async (trx) => {
    for (const entry of dates) {
      await trx('room_inventory')
        .insert({ room_type_id: roomTypeId, date: entry.date, total: entry.total })
        .onConflict(['room_type_id', 'date'])
        .merge({ total: entry.total });
    }
  });
}

async function setInventoryBlock(roomTypeId, date, blocked) {
  const [row] = await db('room_inventory')
    .insert({ room_type_id: roomTypeId, date, total: 0, blocked: blocked ?? 1 })
    .onConflict(['room_type_id', 'date'])
    .merge({ blocked: blocked ?? 1 })
    .returning('*');

  return row;
}

module.exports = {
  listRoomTypesByHotel,
  getRoomTypeById,
  getInventory,
  createRoomType,
  updateRoomType,
  deactivateRoomType,
  addRoomImage,
  setPrimaryImage,
  deleteImage,
  updateAmenities,
  updateInventory,
  setInventoryBlock,
};
