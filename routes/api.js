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

router.get('/list-tables', async (req, res) => {
  if (!db) {
    return res.status(500).json({ ok: false, error: 'Database is not configured.' });
  }

  try {
    const result = await db.execute(`
      SELECT name
      FROM sqlite_master
      WHERE type='table'
      ORDER BY name
    `);

    res.json({
      ok: true,
      tables: result.rows || []
    });
  } catch (error) {
    console.error('Error listing tables:', error);
    res.status(500).json({ ok: false, error: error.message });
  }

  router.get('/test-insert-homework', async (req, res) => {
  if (!db) {
    return res.status(500).json({ ok: false, error: 'Database is not configured.' });
  }

  try {
    await ensureSchema();

    const item = {
      id: `hw-test-${Date.now()}`,
      schoolId: 'school-001',
      teacherId: 'teacher-001',
      classId: 'class-001',
      subject: 'English',
      title: 'Test Homework',
      description: 'Test insert from API route',
      dueDate: '2026-04-10',
      estimatedMinutes: 20,
      createdAt: new Date().toISOString()
    };

    await db.execute({
      sql: `
        INSERT INTO teacher_homework (
          id,
          school_id,
          teacher_id,
          class_id,
          subject,
          title,
          description,
          due_date,
          estimated_minutes,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        item.id,
        item.schoolId,
        item.teacherId,
        item.classId,
        item.subject,
        item.title,
        item.description,
        item.dueDate,
        item.estimatedMinutes,
        item.createdAt
      ]
    });

    res.json({ ok: true, inserted: item });
  } catch (error) {
    console.error('Error test inserting homework:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});
});

module.exports = router;