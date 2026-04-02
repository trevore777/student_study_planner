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

function writeHomework(items) {
  fs.writeFileSync(HOMEWORK_FILE, JSON.stringify(items, null, 2));
}

router.get('/login', (req, res) => {
  res.render('teacher-login', { title: 'Teacher Login' });
});

router.get('/dashboard', (req, res) => {
  const items = readHomework().sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  res.render('teacher-dashboard', {
    title: 'Teacher Dashboard',
    homeworkItems: items
  });
});

router.get('/homework/new', (req, res) => {
  res.render('teacher-homework-new', { title: 'Post Homework' });
});

router.post('/homework/new', (req, res) => {
  const items = readHomework();

  const newItem = {
    id: `hw-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    className: req.body.className,
    subject: req.body.subject,
    title: req.body.title,
    description: req.body.description,
    dueDate: req.body.dueDate,
    estimatedMinutes: Number(req.body.estimatedMinutes) || 20,
    createdAt: new Date().toISOString()
  };

  items.push(newItem);
  writeHomework(items);

  res.redirect('/teacher/dashboard');
});

router.get('/summary', (req, res) => {
  const items = readHomework();
  res.render('teacher-summary', {
    title: 'Class Summary',
    homeworkItems: items
  });
});

module.exports = router;