const path = require('path');
const express = require('express');
const cors = require('cors');
const { requestId } = require('./middleware/requestId.middleware');
const { apiErrorHandler, notFoundHandler } = require('./core/ApiResponse');

const app = express();

app.use(requestId);
app.use(cors());
// Keep the raw bytes around: Razorpay webhook signatures are computed over the exact body.
app.use(express.json({ verify: (req, res, buf) => { req.rawBody = buf; } }));
// Hotel/room photos are uploaded through admin/server into its uploads folder;
// the website serves the same files read-only.
app.use('/uploads', express.static(path.join(__dirname, '..', '..', '..', 'admin', 'server', 'uploads')));

app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Composition root: each feature module owns its own route -> controller -> service triplet.
// This server only backs the guest website; everything admin-facing lives in admin/server.
app.use('/api/auth', require('./modules/auth/route'));
app.use('/api/hotels', require('./modules/hotel/route'));
app.use('/api', require('./modules/room/route')); // /hotels/:hotelId/room-offers
app.use('/api/bookings', require('./modules/booking/route'));
app.use('/api/checkout', require('./modules/checkout/route'));
app.use('/api/offers', require('./modules/offer/route'));

// Must stay last: unmatched API routes, then the global error handler.
app.use('/api', notFoundHandler);
app.use(apiErrorHandler);

module.exports = app;
