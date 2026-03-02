const db = require('../db');

const FILE = 'bookings.json';

function findAll() {
  return db.read(FILE);
}

function findByUser(userId) {
  return findAll().filter(b => b.userId === userId);
}

function findByRoom(roomId) {
  return findAll().filter(b => b.roomId === roomId);
}

function create(booking) {
  const bookings = findAll();
  booking.id = Date.now().toString();
  booking.createdAt = new Date().toISOString();
  bookings.push(booking);
  db.write(FILE, bookings);
  return booking;
}

module.exports = { findAll, findByUser, findByRoom, create };
