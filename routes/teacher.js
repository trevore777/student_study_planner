const express = require('express');
const router = express.Router();

router.get('/login', (req, res) => {
  res.render('teacher-login', { title: 'Teacher Login' });
});

router.get('/dashboard', (req, res) => {
  const samplePosts = require('../data/teacher-posts.json');
  res.render('teacher-dashboard', { title: 'Teacher Dashboard', samplePosts });
});

module.exports = router;