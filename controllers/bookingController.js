const BookingModel = require('../models/bookingModel');
const { ROOMS } = require('../constants');

function createBooking(req, res) {
  try {
    const { roomId, checkIn, checkOut, guests } = req.body;
    if (!roomId || !checkIn || !checkOut) {
      return res.status(400).json({ success: false, message: 'Room, check-in and check-out dates required' });
    }
    const room = ROOMS.find(r => r.id === Number(roomId));
    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }
    const booking = BookingModel.create({
      userId: req.session.user.id,
      userName: req.session.user.name,
      roomId: Number(roomId),
      roomName: room.name,
      checkIn,
      checkOut,
      guests: guests || 1,
      status: 'confirmed'
    });
    res.json({ success: true, booking });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

function getUserBookings(req, res) {
  const bookings = BookingModel.findByUser(req.session.user.id);
  res.json({ success: true, bookings });
}

function getRooms(req, res) {
  res.json({ success: true, rooms: ROOMS });
}

module.exports = { createBooking, getUserBookings, getRooms };
