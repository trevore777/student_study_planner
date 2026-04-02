const express = require('express');
const path = require('path');
const fs = require('fs');

const router = express.Router();

const HOMEWORK_FILE = path.join(__dirname, '../data/teacher-homework.json');

function readHomework() {
  try {
    const raw = fs.readFileSync(HOMEWORK_FILE, 'utf8');
    return JSON.parse(raw || '[]');
  } catch (error) {
    return [];
  }
}

router.get('/teacher-homework', (req, res) => {
  const items = readHomework().sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  res.json(items);
});

module.exports = router;