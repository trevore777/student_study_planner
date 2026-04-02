const express = require('express');
const router = express.Router();
const db = require('../lib/turso');

router.get('/teacher-homework', async (req, res) => {
  try {
    const result = await db.execute(`
      SELECT *
      FROM teacher_homework
      ORDER BY created_at DESC
    `);

    res.json(result.rows || []);
  } catch (error) {
    console.error('Error loading teacher homework:', error);
    res.status(500).json({ error: 'Failed to load teacher homework.' });
  }
});

router.get('/setup-db', async (req, res) => {
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS teacher_homework (
        id TEXT PRIMARY KEY,
        class_name TEXT NOT NULL,
        subject TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        due_date TEXT NOT NULL,
        estimated_minutes INTEGER NOT NULL DEFAULT 20,
        created_at TEXT NOT NULL
      )
    `);

    res.json({ ok: true, message: 'teacher_homework table is ready' });
  } catch (error) {
    console.error('Error setting up DB:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

module.exports = router;