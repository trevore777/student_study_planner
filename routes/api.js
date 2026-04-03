const express = require('express');
const router = express.Router();
const db = require('../lib/turso');
const ensureSchema = require('../lib/ensureSchema');

router.get('/debug-env', (req, res) => {
  res.json({
    tursoUrl: process.env.TURSO_DATABASE_URL ? 'SET' : 'MISSING',
    tursoToken: process.env.TURSO_AUTH_TOKEN ? 'SET' : 'MISSING'
  });
});

router.get('/setup-db', async (req, res) => {
  if (!db) {
    return res.status(500).json({
      ok: false,
      error: 'Database is not configured. Check TURSO_DATABASE_URL and TURSO_AUTH_TOKEN.'
    });
  }

  try {
    await ensureSchema();

    res.json({
      ok: true,
      message: 'Multi-school-ready tables are set up'
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
    await ensureSchema();

    const result = await db.execute(`
      SELECT
        th.id,
        th.school_id,
        th.teacher_id,
        th.class_id,
        th.subject,
        th.title,
        th.description,
        th.due_date,
        th.estimated_minutes,
        th.created_at,
        s.name AS school_name,
        t.name AS teacher_name,
        c.name AS class_name
      FROM teacher_homework th
      LEFT JOIN schools s ON s.id = th.school_id
      LEFT JOIN teachers t ON t.id = th.teacher_id
      LEFT JOIN classes c ON c.id = th.class_id
      ORDER BY th.created_at DESC
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