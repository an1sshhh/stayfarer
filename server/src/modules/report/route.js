const express = require('express');
const { requireAuth, requireRole } = require('../../middleware/auth.middleware');
const controller = require('./controller');

const router = express.Router();

router.use(requireAuth, requireRole('admin'));

router.get('/revenue', controller.revenue);
router.get('/bookings', controller.bookings);
router.get('/hotel-performance', controller.hotelPerformance);
router.get('/room-performance', controller.roomPerformance);
router.get('/customers', controller.customers);
router.get('/coupon-usage', controller.couponUsage);
router.get('/cancellations', controller.cancellations);

module.exports = router;
