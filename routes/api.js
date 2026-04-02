const express = require('express');
const router = express.Router();
const samplePosts = require('../data/teacher-posts.json');

router.get('/teacher-posts', (req, res) => {
  res.json(samplePosts);
});

router.get('/health', (req, res) => {
  res.json({ ok: true, app: 'StudyTrack', version: '0.1.0' });
});

module.exports = router;