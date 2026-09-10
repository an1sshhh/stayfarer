function dateRange(checkIn, checkOut) {
  // Work entirely in UTC to avoid local-timezone day shifts.
  const dates = [];
  const cursor = new Date(`${checkIn}T00:00:00Z`);
  const end = new Date(`${checkOut}T00:00:00Z`);
  while (cursor < end) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

/**
 * Checks and atomically reserves inventory for every night of the stay.
 * Must run inside a transaction with row locks to prevent double-booking
 * under concurrent requests.
 */
async function reserveInventory(trx, roomTypeId, checkIn, checkOut, numRooms) {
  const dates = dateRange(checkIn, checkOut);

  const rows = await trx('room_inventory')
    .where({ room_type_id: roomTypeId })
    .whereIn('date', dates)
    .forUpdate();

  const byDate = Object.fromEntries(rows.map((r) => [r.date, r]));

  for (const date of dates) {
    const row = byDate[date];
    if (!row) {
      throw new Error(`No inventory configured for ${date}`);
    }
    const available = row.total - row.booked - row.blocked;
    if (available < numRooms) {
      throw new Error(`Not enough rooms available on ${date}`);
    }
  }

  for (const date of dates) {
    await trx('room_inventory')
      .where({ room_type_id: roomTypeId, date })
      .increment('booked', numRooms);
  }
}

async function releaseInventory(trx, roomTypeId, checkIn, checkOut, numRooms) {
  const dates = dateRange(checkIn, checkOut);
  await trx('room_inventory')
    .where({ room_type_id: roomTypeId })
    .whereIn('date', dates)
    .decrement('booked', numRooms);
}

module.exports = { dateRange, reserveInventory, releaseInventory };
