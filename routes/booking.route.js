const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { requireAuth } = require('../middleware/authMiddleware');

router.get('/rooms', bookingController.getRooms);
router.post('/book', requireAuth, bookingController.createBooking);
router.get('/my-bookings', requireAuth, bookingController.getUserBookings);

module.exports = router;
