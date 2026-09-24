const express = require('express');
const controller = require('./controller');

const router = express.Router();

// Public reads for the guest website (hotel management lives in admin/server).
router.get('/search', controller.search);
router.get('/suggest', controller.suggest);
router.get('/destinations', controller.destinations);
router.get('/:id', controller.getById);

module.exports = router;
