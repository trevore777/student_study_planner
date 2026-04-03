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

    const homeworkResult = await db.execute(`
      SELECT
        th.id,
        th.school_id,
        th.teacher_id,
        th.class_id,
        th.class_name,
        th.subject,
        th.title,
        th.description,
        th.due_date,
        th.estimated_minutes,
        th.created_at,
        s.name AS school_name,
        t.name AS teacher_name,
        c.name AS linked_class_name
      FROM teacher_homework th
      LEFT JOIN schools s ON s.id = th.school_id
      LEFT JOIN teachers t ON t.id = th.teacher_id
      LEFT JOIN classes c ON c.id = th.class_id
      ORDER BY th.created_at DESC
    `);

    const claimsResult = await db.execute(`
      SELECT
        id,
        school_id,
        student_name,
        year_level,
        challenge_days,
        claimed_at,
        status
      FROM credit_claims
      ORDER BY claimed_at DESC
    `);

    res.render('teacher-dashboard', {
      title: 'Teacher Dashboard',
      homeworkItems: homeworkResult.rows || [],
      creditClaims: claimsResult.rows || []
    });
  } catch (error) {
    console.error('Error loading teacher dashboard:', error);
    res.status(500).send(`Unable to load teacher dashboard. ${error.message}`);
  }
});

router.post('/claims/:id/approve', async (req, res) => {
  if (!db) {
    return res.status(500).send('Database is not configured. Check TURSO_DATABASE_URL and TURSO_AUTH_TOKEN.');
  }

  try {
    await ensureSchema();

    await db.execute({
      sql: `
        UPDATE credit_claims
        SET status = 'approved'
        WHERE id = ?
      `,
      args: [req.params.id]
    });

    res.redirect('/teacher/dashboard');
  } catch (error) {
    console.error('Error approving Kings Credit claim:', error);
    res.status(500).send(`Unable to approve claim. ${error.message}`);
  }
});

router.post('/claims/:id/reject', async (req, res) => {
  if (!db) {
    return res.status(500).send('Database is not configured. Check TURSO_DATABASE_URL and TURSO_AUTH_TOKEN.');
  }

  try {
    await ensureSchema();

    await db.execute({
      sql: `
        UPDATE credit_claims
        SET status = 'rejected'
        WHERE id = ?
      `,
      args: [req.params.id]
    });

    res.redirect('/teacher/dashboard');
  } catch (error) {
    console.error('Error rejecting Kings Credit claim:', error);
    res.status(500).send(`Unable to reject claim. ${error.message}`);
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
    res.status(500).send(`Unable to load homework form. ${error.message}`);
  }
});

router.post('/homework/new', async (req, res) => {
  if (!db) {
    return res.status(500).send('Database is not configured. Check TURSO_DATABASE_URL and TURSO_AUTH_TOKEN.');
  }

  try {
    await ensureSchema();

    const schoolId = (req.body.schoolId || DEFAULT_SCHOOL_ID).trim();
    const teacherId = (req.body.teacherId || DEFAULT_TEACHER_ID).trim();
    const classId = (req.body.classId || DEFAULT_CLASS_ID).trim();
    const subject = (req.body.subject || '').trim();
    const title = (req.body.title || '').trim();
    const description = (req.body.description || '').trim();
    const dueDate = (req.body.dueDate || '').trim();
    const estimatedMinutes = Number(req.body.estimatedMinutes) || 20;

    if (!schoolId || !teacherId || !classId || !subject || !title || !description || !dueDate) {
      return res.status(400).send('Missing required homework fields.');
    }

    const classLookup = await db.execute({
      sql: `
        SELECT id, name
        FROM classes
        WHERE id = ?
        LIMIT 1
      `,
      args: [classId]
    });

    const selectedClass = (classLookup.rows || [])[0];
    const className = selectedClass?.name || 'Unknown Class';

    const newItem = {
      id: `hw-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      schoolId,
      teacherId,
      classId,
      className,
      subject,
      title,
      description,
      dueDate,
      estimatedMinutes,
      createdAt: new Date().toISOString()
    };

    await db.execute({
      sql: `
        INSERT INTO teacher_homework (
          id,
          school_id,
          teacher_id,
          class_id,
          class_name,
          subject,
          title,
          description,
          due_date,
          estimated_minutes,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        newItem.id,
        newItem.schoolId,
        newItem.teacherId,
        newItem.classId,
        newItem.className,
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
    res.status(500).send(`Unable to save homework. ${error.message}`);
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
        th.class_name,
        th.subject,
        th.title,
        th.description,
        th.due_date,
        th.estimated_minutes,
        th.created_at,
        s.name AS school_name,
        t.name AS teacher_name,
        c.name AS linked_class_name
      FROM teacher_homework th
      LEFT JOIN schools s ON s.id = th.school_id
      LEFT JOIN teachers t ON t.id = th.teacher_id
      LEFT JOIN classes c ON c.id = th.class_id
      ORDER BY s.name ASC, th.class_name ASC, th.due_date ASC
    `);

    res.render('teacher-summary', {
      title: 'Class Summary',
      homeworkItems: result.rows || []
    });
  } catch (error) {
    console.error('Error loading teacher summary:', error);
    res.status(500).send(`Unable to load class summary. ${error.message}`);
  }
});

module.exports = router;