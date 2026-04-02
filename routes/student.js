const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.render('index', { title: 'StudyTrack' });
});

router.get('/dashboard', (req, res) => {
  res.render('dashboard', { title: 'Dashboard' });
});

router.get('/planner', (req, res) => {
  res.render('planner', { title: 'Weekly Planner' });
});

router.get('/subjects', (req, res) => {
  res.render('subjects', { title: 'Subjects' });
});

router.get('/evidence', (req, res) => {
  res.render('evidence', { title: 'Evidence Log' });
});

router.get('/settings', (req, res) => {
  res.render('settings', { title: 'Settings' });
});

router.get('/study', (req, res) => {
  res.render('study', { title: 'Study Session' });
});

module.exports = router;