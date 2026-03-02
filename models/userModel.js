const db = require('../db');

const FILE = 'users.json';

function findAll() {
  return db.read(FILE);
}

function findByEmail(email) {
  const users = findAll();
  return users.find(u => u.email === email);
}

function create(user) {
  const users = findAll();
  user.id = Date.now().toString();
  user.createdAt = new Date().toISOString();
  users.push(user);
  db.write(FILE, users);
  return user;
}

module.exports = { findAll, findByEmail, create };
