const db = require('../../database/db');

function diffNights(checkIn, checkOut) {
  const ms = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  return Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)));
}

async function getActiveTaxes() {
  return db('tax_rules').where({ active: true });
}

function applyTax(amount, tax) {
  return tax.value_type === 'percentage' ? (amount * Number(tax.value)) / 100 : Number(tax.value);
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

/**
 * Centralized price calculation: room price -> taxes/fees -> discount -> total.
 * Never trust a price sent from the frontend; always recompute here.
 */
async function calculateBookingPrice({ ratePlanPrice, nights, numRooms = 1, discountAmount = 0 }) {
  const roomPrice = Number(ratePlanPrice) * nights * numRooms;
  const taxes = await getActiveTaxes();

  let taxAmount = 0;
  let feeAmount = 0;
  for (const tax of taxes) {
    const value = applyTax(roomPrice, tax);
    if (tax.applies_to === 'service_charge') feeAmount += value;
    else taxAmount += value;
  }

  const totalAmount = Math.max(0, roomPrice + taxAmount + feeAmount - discountAmount);

  return {
    roomPrice: round2(roomPrice),
    taxAmount: round2(taxAmount),
    feeAmount: round2(feeAmount),
    discountAmount: round2(discountAmount),
    totalAmount: round2(totalAmount),
  };
}

module.exports = { calculateBookingPrice, diffNights };
