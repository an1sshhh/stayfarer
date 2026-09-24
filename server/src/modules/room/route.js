const express = require('express');
const controller = require('./controller');

const router = express.Router();

// Mounted at '/api' in app.js. Room management lives in admin/server.
router.get('/hotels/:hotelId/room-offers', controller.listOffers);

module.exports = router;
