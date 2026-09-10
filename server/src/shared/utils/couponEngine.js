const db = require('../../database/db');

/**
 * Server-side coupon validation, shared by the booking and coupon modules.
 * Never trust a discount amount sent by the client.
 */
async function validateAndCalculateDiscount({ code, hotelId, roomTypeId, ratePlanId, customerId, roomPrice }) {
  const coupon = await db('coupons').where({ code, active: true }).first();
  if (!coupon) return { valid: false, message: 'Invalid or inactive coupon' };

  const today = new Date().toISOString().slice(0, 10);
  if (today < coupon.valid_from || today > coupon.valid_until) {
    return { valid: false, message: 'Coupon is not valid on this date' };
  }

  if (Number(roomPrice) < Number(coupon.min_booking_amount)) {
    return { valid: false, message: `Minimum booking amount is ${coupon.min_booking_amount}` };
  }

  const restrictions = await Promise.all([
    db('coupon_hotels').where({ coupon_id: coupon.id }),
    db('coupon_room_types').where({ coupon_id: coupon.id }),
    db('coupon_rate_plans').where({ coupon_id: coupon.id }),
  ]);
  const [hotelRestrictions, roomTypeRestrictions, ratePlanRestrictions] = restrictions;

  if (hotelRestrictions.length && !hotelRestrictions.some((r) => r.hotel_id === hotelId)) {
    return { valid: false, message: 'Coupon not applicable to this hotel' };
  }
  if (roomTypeRestrictions.length && !roomTypeRestrictions.some((r) => r.room_type_id === roomTypeId)) {
    return { valid: false, message: 'Coupon not applicable to this room type' };
  }
  if (ratePlanRestrictions.length && !ratePlanRestrictions.some((r) => r.rate_plan_id === ratePlanId)) {
    return { valid: false, message: 'Coupon not applicable to this rate plan' };
  }

  if (coupon.usage_limit) {
    const [{ count }] = await db('coupon_usages').where({ coupon_id: coupon.id }).count({ count: '*' });
    if (Number(count) >= coupon.usage_limit) return { valid: false, message: 'Coupon usage limit reached' };
  }

  if (coupon.per_customer_limit && customerId) {
    const [{ count }] = await db('coupon_usages')
      .where({ coupon_id: coupon.id, customer_id: customerId })
      .count({ count: '*' });
    if (Number(count) >= coupon.per_customer_limit) {
      return { valid: false, message: 'You have already used this coupon' };
    }
  }

  let discount =
    coupon.discount_type === 'percentage' ? (Number(roomPrice) * Number(coupon.discount_value)) / 100 : Number(coupon.discount_value);

  if (coupon.max_discount != null) {
    discount = Math.min(discount, Number(coupon.max_discount));
  }

  return { valid: true, coupon, discountAmount: Math.round(discount * 100) / 100 };
}

module.exports = { validateAndCalculateDiscount };
