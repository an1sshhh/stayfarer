const db = require('../../database/db');

/**
 * Offers the guest site may show right now: published in the admin panel,
 * inside their own schedule, and — if they promote a coupon — only while
 * that coupon is active and valid. Keep in sync with liveStatus() in
 * admin/server/src/modules/offer/service.js.
 */
async function listLiveOffers({ placement } = {}) {
  const today = new Date().toISOString().slice(0, 10);
  let query = db('offers')
    .leftJoin('coupons', 'coupons.id', 'offers.coupon_id')
    .where('offers.is_active', true)
    .where((qb) => qb.whereNull('offers.valid_from').orWhere('offers.valid_from', '<=', today))
    .where((qb) => qb.whereNull('offers.valid_until').orWhere('offers.valid_until', '>=', today))
    .where((qb) =>
      qb.whereNull('offers.coupon_id').orWhere((c) =>
        c.where('coupons.active', true).where('coupons.valid_from', '<=', today).where('coupons.valid_until', '>=', today)
      )
    )
    .select(
      'offers.id', 'offers.title', 'offers.subtitle', 'offers.badge', 'offers.terms', 'offers.image_url', 'offers.theme',
      'offers.cta_label', 'offers.cta_url', 'offers.valid_until',
      'coupons.code as coupon_code', 'coupons.discount_type', 'coupons.discount_value',
      'coupons.min_booking_amount', 'coupons.max_discount', 'coupons.valid_until as coupon_valid_until'
    )
    .orderBy([{ column: 'offers.sort_order' }, { column: 'offers.created_at', order: 'desc' }]);

  // At checkout only coupon offers are useful, and only those the admin flagged for it.
  if (placement === 'checkout') query = query.where('offers.show_at_checkout', true).whereNotNull('offers.coupon_id');

  const rows = await query.limit(24);
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    subtitle: r.subtitle,
    badge: r.badge,
    terms: r.terms,
    image_url: r.image_url,
    theme: r.theme,
    cta_label: r.cta_label,
    cta_url: r.cta_url,
    // The earlier of the offer's own end date and its coupon's.
    valid_until: [r.valid_until, r.coupon_valid_until].filter(Boolean).sort()[0] ?? null,
    coupon: r.coupon_code
      ? {
          code: r.coupon_code,
          discount_type: r.discount_type,
          discount_value: r.discount_value,
          min_booking_amount: r.min_booking_amount,
          max_discount: r.max_discount,
        }
      : null,
  }));
}

module.exports = { listLiveOffers };
