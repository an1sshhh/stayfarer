const express = require('express');
const { ApiResponse } = require('../../core/ApiResponse');
const offerService = require('./service');

const router = express.Router();

// Public: offers curated in the admin panel. Writes live in admin/server.
router.get('/', async (req, res, next) => {
  try {
    ApiResponse.success(res, { data: await offerService.listLiveOffers({ placement: req.query.placement }) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
