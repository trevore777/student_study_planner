const express = require('express');
const router = express.Router();
const db = require('../lib/turso');
const ensureSchema = require('../lib/ensureSchema');

const DEFAULT_SCHOOL_ID = 'school-001';
const DEFAULT_TEACHER_ID = 'teacher-001';
const DEFAULT_CLASS_ID = 'class-001';

router.get('/login', (req, res) => {
  res.render('teacher-login', { title: 'Teacher Login' });
});

router.get('/dashboard', async (req, res) => {
  if (!db) {
    return res.status(500).send('Database is not configured. Check TURSO_DATABASE_URL and TURSO_AUTH_TOKEN.');
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

    res.render('teacher-dashboard', {
      title: 'Teacher Dashboard',
      homeworkItems: result.rows || []
    });
  } catch (error) {
    console.error('Error loading teacher dashboard:', error);
    res.status(500).send('Unable to load teacher dashboard.');
  }
});

router.get('/homework/new', async (req, res) => {
  if (!db) {
    return res.status(500).send('Database is not configured. Check TURSO_DATABASE_URL and TURSO_AUTH_TOKEN.');
  }

  try {
    await ensureSchema();

    const schoolsResult = await db.execute(`
      SELECT id, name, short_code
      FROM schools
      ORDER BY name ASC
    `);

    const teachersResult = await db.execute(`
      SELECT id, school_id, name, email
      FROM teachers
      ORDER BY name ASC
    `);

    const classesResult = await db.execute(`
      SELECT id, school_id, teacher_id, name, year_level
      FROM classes
      ORDER BY name ASC
    `);

    res.render('teacher-homework-new', {
      title: 'Post Homework',
      schools: schoolsResult.rows || [],
      teachers: teachersResult.rows || [],
      classes: classesResult.rows || [],
      defaults: {
        schoolId: DEFAULT_SCHOOL_ID,
        teacherId: DEFAULT_TEACHER_ID,
        classId: DEFAULT_CLASS_ID
      }
    });
  } catch (error) {
    console.error('Error loading teacher homework form:', error);
    res.status(500).send('Unable to load homework form.');
  }
});

router.post('/homework/new', async (req, res) => {
  if (!db) {
    return res.status(500).send('Database is not configured. Check TURSO_DATABASE_URL and TURSO_AUTH_TOKEN.');
  }

  try {
    await ensureSchema();

    const newItem = {
      id: `hw-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      schoolId: (req.body.schoolId || DEFAULT_SCHOOL_ID).trim(),
      teacherId: (req.body.teacherId || DEFAULT_TEACHER_ID).trim(),
      classId: (req.body.classId || DEFAULT_CLASS_ID).trim(),
      subject: (req.body.subject || '').trim(),
      title: (req.body.title || '').trim(),
      description: (req.body.description || '').trim(),
      dueDate: (req.body.dueDate || '').trim(),
      estimatedMinutes: Number(req.body.estimatedMinutes) || 20,
      createdAt: new Date().toISOString()
    };

    if (
      !newItem.schoolId ||
      !newItem.teacherId ||
      !newItem.classId ||
      !newItem.subject ||
      !newItem.title ||
      !newItem.description ||
      !newItem.dueDate
    ) {
      return res.status(400).send('Missing required homework fields.');
    }

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
        newItem.id,
        newItem.schoolId,
        newItem.teacherId,
        newItem.classId,
        newItem.subject,
        newItem.title,
        newItem.description,
        newItem.dueDate,
        newItem.estimatedMinutes,
        newItem.createdAt
      ]
    });

    res.redirect('/teacher/dashboard');
  } catch (error) {
    console.error('Error creating teacher homework:', error);
    res.status(500).send('Unable to save homework.');
    router.get('/dashboard', async (req, res) => {
  if (!db) {
    return res.status(500).send('Database is not configured. Check TURSO_DATABASE_URL and TURSO_AUTH_TOKEN.');
  }

  try {
    console.log('Teacher dashboard: calling ensureSchema()');
    await ensureSchema();
    console.log('Teacher dashboard: ensureSchema() finished');

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

    res.render('teacher-dashboard', {
      title: 'Teacher Dashboard',
      homeworkItems: result.rows || []
    });
  } catch (error) {
    console.error('Error loading teacher dashboard:', error);
    res.status(500).send(`Unable to load teacher dashboard. ${error.message}`);
  }
});
  }
});

router.get('/summary', async (req, res) => {
  if (!db) {
    return res.status(500).send('Database is not configured. Check TURSO_DATABASE_URL and TURSO_AUTH_TOKEN.');
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
      ORDER BY s.name ASC, c.name ASC, th.due_date ASC
    `);

    res.render('teacher-summary', {
      title: 'Class Summary',
      homeworkItems: result.rows || []
    });
  } catch (error) {
    console.error('Error loading teacher summary:', error);
    res.status(500).send('Unable to load class summary.');
  }
});

module.exports = router;