const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');

function ensureFile(filename, defaultData = []) {
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2));
  }
  return filePath;
}

function read(filename) {
  const filePath = ensureFile(filename);
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw);
}

function write(filename, data) {
  const filePath = ensureFile(filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

module.exports = { read, write };
