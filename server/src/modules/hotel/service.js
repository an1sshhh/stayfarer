const db = require('../../database/db');
const { ApiError } = require('../../core/ApiError');
const { dateRange } = require('../../shared/utils/availability');
const { estimateTaxesAndFees } = require('../../shared/utils/pricing');

/** Treats "", "undefined" and "null" as absent so a stray query param can't blank a list. */
function filterParam(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed && trimmed !== 'undefined' && trimmed !== 'null' ? trimmed : null;
}

/**
 * Hotel ids with at least one active room type that has enough free
 * inventory (total - booked - blocked >= numRooms) on every night of the
 * stay, and enough capacity for `guests` if given. Mirrors the checks
 * `reserveInventory` makes at booking time, so search results only ever
 * promise rooms that are actually bookable.
 */
async function findAvailableHotelIds({ checkIn, checkOut, guests, numRooms = 1 }) {
  const dates = dateRange(checkIn, checkOut);
  if (dates.length === 0) return null;

  let query = db('room_inventory')
    .join('room_types', 'room_types.id', 'room_inventory.room_type_id')
    .where('room_types.status', 'active')
    .whereIn('room_inventory.date', dates)
    .andWhereRaw('room_inventory.total - room_inventory.booked - room_inventory.blocked >= ?', [numRooms]);

  if (guests) query = query.andWhere('room_types.max_occupancy', '>=', guests);

  const rows = await query
    .groupBy('room_types.hotel_id', 'room_inventory.room_type_id')
    .havingRaw('count(distinct room_inventory.date) = ?', [dates.length])
    .select('room_types.hotel_id');

  return [...new Set(rows.map((r) => r.hotel_id))];
}

const SORTS = {
  recommended: (a, b) => (b.star_category ?? 0) - (a.star_category ?? 0) || b.review_score - a.review_score || a.min_price - b.min_price,
  price_asc: (a, b) => a.min_price - b.min_price,
  price_desc: (a, b) => b.min_price - a.min_price,
  rating_desc: (a, b) => b.review_score - a.review_score || b.review_count - a.review_count,
  stars_desc: (a, b) => (b.star_category ?? 0) - (a.star_category ?? 0) || a.min_price - b.min_price,
};

const csv = (value) => (filterParam(value) ? value.split(',').map((v) => v.trim()).filter(Boolean) : []);
const hasBreakfast = (meal) => typeof meal === 'string' && (meal.includes('breakfast') || meal === 'all_meals');

/**
 * Public hotel search behind the results page: availability-aware (when
 * dates are given), with OTA-style filters, sort, facets and pagination.
 * Hotels are admin-curated so the candidate set is small; filtering and
 * facet counting happen in memory after three set-based queries.
 */
async function searchHotels(q) {
  const guests = Number.parseInt(q.guests, 10) || undefined;
  const rooms = Math.max(1, Number.parseInt(q.rooms, 10) || 1);
  const page = Math.max(1, Number.parseInt(q.page, 10) || 1);
  const pageSize = Math.min(50, Math.max(1, Number.parseInt(q.pageSize, 10) || 10));
  const sort = SORTS[q.sort] ? q.sort : 'recommended';

  let query = db('hotels').where({ status: 'active' });
  const destination = filterParam(q.city) || filterParam(q.q);
  if (destination) {
    query = query.where((qb) =>
      qb.whereILike('city', `%${destination}%`).orWhereILike('name', `%${destination}%`).orWhereILike('state', `%${destination}%`)
    );
  }
  if (q.checkIn && q.checkOut) {
    if (q.checkOut <= q.checkIn) throw ApiError.badRequest('Check-out must be later than check-in');
    const perRoomGuests = guests ? Math.ceil(guests / rooms) : undefined;
    const ids = await findAvailableHotelIds({ checkIn: q.checkIn, checkOut: q.checkOut, guests: perRoomGuests, numRooms: rooms });
    if (ids) query = query.whereIn('id', ids.length ? ids : [-1]);
  }
  const hotels = await query.select();
  if (!hotels.length) return { data: [], total: 0, page, pageSize, facets: emptyFacets() };

  const ids = hotels.map((h) => h.id);
  const [plans, reviews, amenityRows, imageRows] = await Promise.all([
    db('rate_plans')
      .join('room_types', 'room_types.id', 'rate_plans.room_type_id')
      .whereIn('room_types.hotel_id', ids)
      .where({ 'room_types.status': 'active', 'rate_plans.status': 'active' })
      .select('room_types.hotel_id', 'room_types.max_occupancy', 'rate_plans.price', 'rate_plans.refundable', 'rate_plans.meal_inclusion'),
    db('reviews').whereIn('hotel_id', ids).where({ status: 'published' })
      .groupBy('hotel_id').select('hotel_id').avg('rating as avg').count('* as count'),
    db('hotel_amenities').join('amenities', 'amenities.id', 'hotel_amenities.amenity_id')
      .whereIn('hotel_amenities.hotel_id', ids).select('hotel_amenities.hotel_id', 'amenities.id', 'amenities.name'),
    db('hotel_images').whereIn('hotel_id', ids).orderBy([{ column: 'is_primary', order: 'desc' }, 'sort_order']).select('hotel_id', 'url'),
  ]);

  const byHotel = (rows) => rows.reduce((acc, r) => ((acc[r.hotel_id] ??= []).push(r), acc), {});
  const plansByHotel = byHotel(plans);
  const amenitiesByHotel = byHotel(amenityRows);
  const reviewByHotel = Object.fromEntries(reviews.map((r) => [r.hotel_id, r]));
  const imagesByHotel = byHotel(imageRows);

  let results = hotels
    .map((h) => {
      const hotelPlans = plansByHotel[h.id] || [];
      const fitting = guests ? hotelPlans.filter((p) => p.max_occupancy * rooms >= guests) : hotelPlans;
      const prices = fitting.map((p) => Number(p.price));
      const review = reviewByHotel[h.id];
      return {
        id: h.id, name: h.name, city: h.city, state: h.state, address: h.address, hotel_type: h.hotel_type,
        star_category: h.star_category, latitude: h.latitude, longitude: h.longitude,
        description: h.description ? String(h.description).slice(0, 220) : null,
        min_price: prices.length ? Math.min(...prices) : null,
        review_score: review ? Math.round(Number(review.avg) * 20) / 10 : 0, // 1–5 stars -> 0–10 score
        review_count: review ? Number(review.count) : 0,
        free_cancellation: fitting.some((p) => p.refundable),
        breakfast: fitting.some((p) => hasBreakfast(p.meal_inclusion)),
        amenities: (amenitiesByHotel[h.id] || []).map(({ id, name }) => ({ id, name })),
        images: [...new Set([h.image_url, ...(imagesByHotel[h.id] || []).map((i) => i.url)].filter(Boolean))].slice(0, 6),
      };
    })
    .filter((h) => h.min_price != null);

  // Facets are computed before the user's own filters so every option keeps a meaningful count.
  const facets = buildFacets(results);

  const stars = csv(q.stars).map(Number);
  const types = csv(q.types);
  const amenityIds = csv(q.amenities).map(Number);
  const minPrice = Number(q.minPrice) || 0;
  const maxPrice = Number(q.maxPrice) || Infinity;
  const minScore = Number(q.rating) || 0;

  results = results.filter((h) =>
    h.min_price >= minPrice && h.min_price <= maxPrice &&
    (!stars.length || stars.includes(h.star_category ?? 0)) &&
    (!types.length || types.includes(h.hotel_type)) &&
    (!minScore || h.review_score >= minScore) &&
    (q.freeCancellation !== 'true' || h.free_cancellation) &&
    (q.breakfast !== 'true' || h.breakfast) &&
    amenityIds.every((id) => h.amenities.some((a) => a.id === id))
  );
  results.sort(SORTS[sort]);

  const total = results.length;
  const pageRows = results.slice((page - 1) * pageSize, page * pageSize);
  const taxes = await Promise.all(pageRows.map((h) => estimateTaxesAndFees(h.min_price)));
  pageRows.forEach((h, i) => { h.taxes_and_fees = taxes[i]; });

  return { data: pageRows, total, page, pageSize, sort, facets };
}

function emptyFacets() {
  return { price: { min: 0, max: 0 }, stars: {}, types: {}, amenities: [], freeCancellation: 0, breakfast: 0 };
}

function buildFacets(hotels) {
  const facets = emptyFacets();
  if (!hotels.length) return facets;
  const prices = hotels.map((h) => h.min_price);
  facets.price = { min: Math.floor(Math.min(...prices)), max: Math.ceil(Math.max(...prices)) };
  const amenityCounts = {};
  for (const h of hotels) {
    const star = h.star_category ?? 0;
    facets.stars[star] = (facets.stars[star] || 0) + 1;
    facets.types[h.hotel_type] = (facets.types[h.hotel_type] || 0) + 1;
    if (h.free_cancellation) facets.freeCancellation += 1;
    if (h.breakfast) facets.breakfast += 1;
    for (const a of h.amenities) (amenityCounts[a.id] ??= { id: a.id, name: a.name, count: 0 }).count += 1;
  }
  facets.amenities = Object.values(amenityCounts).sort((a, b) => b.count - a.count).slice(0, 12);
  return facets;
}

/** Destination autocomplete: matching cities first, then matching hotels. */
async function suggestDestinations(term) {
  const q = filterParam(term);
  let cities = db('hotels').where({ status: 'active' })
    .groupBy('city', 'state').select('city', 'state').count('* as hotel_count').orderBy('hotel_count', 'desc').limit(6);
  if (q) cities = cities.where((qb) => qb.whereILike('city', `%${q}%`).orWhereILike('state', `%${q}%`));

  const hotels = q
    ? await db('hotels').where({ status: 'active' }).whereILike('name', `%${q}%`)
        .select('id', 'name', 'city', 'state').limit(5)
    : [];

  return {
    cities: (await cities).map((c) => ({ city: c.city, state: c.state, hotelCount: Number(c.hotel_count) })),
    hotels,
  };
}

/** Homepage "popular destinations": cities with active hotels, a cover image and a from-price. */
async function listDestinations() {
  const rows = await db('hotels')
    .leftJoin('room_types', function () {
      this.on('room_types.hotel_id', 'hotels.id').andOnVal('room_types.status', 'active');
    })
    .leftJoin('rate_plans', function () {
      this.on('rate_plans.room_type_id', 'room_types.id').andOnVal('rate_plans.status', 'active');
    })
    .where('hotels.status', 'active')
    .groupBy('hotels.city')
    .select('hotels.city')
    .countDistinct('hotels.id as hotel_count')
    .min('rate_plans.price as from_price')
    .select(db.raw("(array_agg(hotels.image_url) filter (where hotels.image_url is not null))[1] as image_url"))
    .havingRaw('min(rate_plans.price) is not null')
    .orderBy('hotel_count', 'desc')
    .limit(8);
  return rows.map((r) => ({ ...r, hotel_count: Number(r.hotel_count), from_price: Number(r.from_price) }));
}

async function getHotelById(id) {
  const hotel = await db('hotels').where({ id }).first();
  if (!hotel) throw ApiError.notFound('Hotel not found');

  const images = await db('hotel_images').where({ hotel_id: hotel.id }).orderBy('sort_order');
  const amenities = await db('hotel_amenities')
    .join('amenities', 'amenities.id', 'hotel_amenities.amenity_id')
    .where('hotel_amenities.hotel_id', hotel.id)
    .select('amenities.id', 'amenities.name');

  const reviews = await db('reviews')
    .leftJoin('customers', 'customers.id', 'reviews.customer_id')
    .where({ 'reviews.hotel_id': hotel.id, 'reviews.status': 'published' })
    .select('reviews.id', 'reviews.rating', 'reviews.review_text', 'reviews.created_at', 'customers.name as customer_name')
    .orderBy('reviews.created_at', 'desc')
    .limit(20);
  const avg = reviews.length ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;

  return {
    ...hotel,
    images,
    amenities,
    reviews: reviews.map(({ customer_name, ...r }) => ({ ...r, author: customer_name ? customer_name.split(' ')[0] : 'Guest' })),
    review_score: Math.round(avg * 20) / 10,
    review_count: reviews.length,
  };
}

module.exports = { searchHotels, suggestDestinations, listDestinations, getHotelById };
