const express = require('express');
const { requireAuth, requireRole } = require('../../middleware/auth.middleware');
const { upload } = require('../../middleware/upload.middleware');
const controller = require('./controller');

const router = express.Router();
const adminOnly = [requireAuth, requireRole('admin')];

// Public reads
router.get('/', controller.list);
router.get('/amenities', controller.listAmenities);
router.get('/:id', controller.getById);
router.get('/:id/images', controller.listImages);

// Admin writes
router.post('/', ...adminOnly, controller.create);
router.put('/:id', ...adminOnly, controller.update);
router.delete('/:id', ...adminOnly, controller.remove);

router.post('/:id/images', ...adminOnly, upload.single('image'), controller.addImage);
router.put('/:id/images/:imageId/primary', ...adminOnly, controller.setPrimaryImage);
router.delete('/:id/images/:imageId', ...adminOnly, controller.deleteImage);

router.put('/:id/amenities', ...adminOnly, controller.updateAmenities);

module.exports = router;
