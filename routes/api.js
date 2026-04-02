const express = require('express');
const router = express.Router();
const db = require('../lib/turso');

router.get('/setup-db', async (req, res) => {
  if (!db) {
    return res.status(500).json({
      ok: false,
      error: 'Database is not configured. Check TURSO_DATABASE_URL and TURSO_AUTH_TOKEN.'
    });
  }

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

    res.json({
      ok: true,
      message: 'teacher_homework table is ready'
    });
  } catch (error) {
    console.error('Error setting up database:', error);
    res.status(500).json({
      ok: false,
      error: error.message || 'Failed to set up database.'
    });
  }
});

router.get('/teacher-homework', async (req, res) => {
  if (!db) {
    return res.status(500).json({
      ok: false,
      error: 'Database is not configured.'
    });
  }

  try {
    const result = await db.execute(`
      SELECT
        id,
        class_name,
        subject,
        title,
        description,
        due_date,
        estimated_minutes,
        created_at
      FROM teacher_homework
      ORDER BY created_at DESC
    `);

    res.json(result.rows || []);
  } catch (error) {
    console.error('Error loading teacher homework:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to load teacher homework.'
    });
  }
});

module.exports = router;