const express = require('express');
const router = express.Router();
const db = require('../lib/turso');

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
    await db.execute(`
      CREATE TABLE IF NOT EXISTS schools (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        short_code TEXT NOT NULL,
        created_at TEXT NOT NULL
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS teachers (
        id TEXT PRIMARY KEY,
        school_id TEXT NOT NULL,
        name TEXT NOT NULL,
        email TEXT,
        role TEXT NOT NULL DEFAULT 'teacher',
        created_at TEXT NOT NULL
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS classes (
        id TEXT PRIMARY KEY,
        school_id TEXT NOT NULL,
        teacher_id TEXT,
        name TEXT NOT NULL,
        year_level TEXT,
        created_at TEXT NOT NULL
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS teacher_homework (
        id TEXT PRIMARY KEY,
        school_id TEXT NOT NULL,
        teacher_id TEXT NOT NULL,
        class_id TEXT NOT NULL,
        subject TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        due_date TEXT NOT NULL,
        estimated_minutes INTEGER NOT NULL DEFAULT 20,
        created_at TEXT NOT NULL
      )
    `);

    await db.execute(`
      INSERT OR IGNORE INTO schools (
        id, name, short_code, created_at
      ) VALUES (
        'school-001',
        'Default School',
        'DEF',
        datetime('now')
      )
    `);

    await db.execute(`
      INSERT OR IGNORE INTO teachers (
        id, school_id, name, email, role, created_at
      ) VALUES (
        'teacher-001',
        'school-001',
        'Default Teacher',
        'teacher@school.local',
        'teacher',
        datetime('now')
      )
    `);

    await db.execute(`
      INSERT OR IGNORE INTO classes (
        id, school_id, teacher_id, name, year_level, created_at
      ) VALUES (
        'class-001',
        'school-001',
        'teacher-001',
        'Year 8A',
        '8',
        datetime('now')
      )
    `);

    res.json({
      ok: true,
      message: 'Multi-school-ready tables are set up',
      seeded: {
        school_id: 'school-001',
        teacher_id: 'teacher-001',
        class_id: 'class-001'
      }
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