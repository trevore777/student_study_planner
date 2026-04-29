const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const db = require('../lib/turso');
const ensureSchema = require('../lib/ensureSchema');
const requireTeacherAuth = require('../middleware/requireTeacherAuth');

const router = express.Router();

router.get('/login', (req, res) => {
  res.render('teacher-login', {
    title: 'Teacher Login',
    error: null
  });
});

router.post('/login', async (req, res) => {
  try {
    await ensureSchema();

    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    const result = await db.execute({
      sql: `
        SELECT id, school_id, name, email, role, password_hash
        FROM teachers
        WHERE lower(email) = ?
          AND role IN ('teacher', 'admin')
        LIMIT 1
      `,
      args: [email]
    });

    const teacher = result.rows[0];

    if (!teacher || !teacher.password_hash) {
      return res.status(401).render('teacher-login', {
        title: 'Teacher Login',
        error: 'Incorrect email or password.'
      });
    }

    const ok = await bcrypt.compare(password, teacher.password_hash);

    if (!ok) {
      return res.status(401).render('teacher-login', {
        title: 'Teacher Login',
        error: 'Incorrect email or password.'
      });
    }

    res.cookie('teacher_auth', {
      teacherId: teacher.id,
      schoolId: teacher.school_id,
      name: teacher.name,
      role: teacher.role || 'teacher'
    }, {
      signed: true,
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 1000 * 60 * 60 * 8,
      path: '/'
    });

    res.redirect('/teacher/dashboard');
  } catch (error) {
    console.error('Teacher login error:', error);
    res.status(500).send(`Teacher login failed. ${error.message}`);
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('teacher_auth', { path: '/' });
  res.redirect('/teacher/login');
});

router.get('/dashboard', requireTeacherAuth, async (req, res) => {
  try {
    await ensureSchema();

    const classes = await db.execute({
      sql: `
        SELECT id, name, year_level, created_at
        FROM classes
        WHERE teacher_id = ?
        ORDER BY year_level ASC, name ASC
      `,
      args: [req.teacherAuth.teacherId]
    });

    const homework = await db.execute({
      sql: `
        SELECT id, class_id, class_name, subject, title, description, due_date, estimated_minutes, created_at
        FROM teacher_homework
        WHERE teacher_id = ?
        ORDER BY created_at DESC
      `,
      args: [req.teacherAuth.teacherId]
    });

    const claims = await db.execute(`
      SELECT id, student_name, year_level, challenge_days, claimed_at, status
      FROM credit_claims
      ORDER BY claimed_at DESC
    `);

    res.render('teacher-dashboard', {
      title: 'Teacher Dashboard',
      teacher: req.teacherAuth,
      classes: classes.rows || [],
      homeworkItems: homework.rows || [],
      creditClaims: claims.rows || []
    });
  } catch (error) {
    console.error('Teacher dashboard error:', error);
    res.status(500).send(`Unable to load teacher dashboard. ${error.message}`);
  }
});

router.get('/classes/new', requireTeacherAuth, (req, res) => {
  res.render('teacher-class-new', {
    title: 'Add Class',
    error: null
  });
});

router.post('/classes/new', requireTeacherAuth, async (req, res) => {
  try {
    await ensureSchema();

    const name = String(req.body.name || '').trim();
    const yearLevel = String(req.body.yearLevel || '').trim();

    if (!name || !yearLevel) {
      return res.status(400).render('teacher-class-new', {
        title: 'Add Class',
        error: 'Class name and year level are required.'
      });
    }

    await db.execute({
      sql: `
        INSERT INTO classes (
          id,
          school_id,
          teacher_id,
          name,
          year_level,
          created_at
        )
        VALUES (?, ?, ?, ?, ?, datetime('now'))
      `,
      args: [
        `class-${crypto.randomUUID()}`,
        req.teacherAuth.schoolId,
        req.teacherAuth.teacherId,
        name,
        yearLevel
      ]
    });

    res.redirect('/teacher/dashboard');
  } catch (error) {
    console.error('Add class error:', error);
    res.status(500).render('teacher-class-new', {
      title: 'Add Class',
      error: `Unable to add class. ${error.message}`
    });
  }
});

router.get('/homework/new', requireTeacherAuth, async (req, res) => {
  try {
    await ensureSchema();

    const classes = await db.execute({
      sql: `
        SELECT id, name, year_level
        FROM classes
        WHERE teacher_id = ?
        ORDER BY year_level ASC, name ASC
      `,
      args: [req.teacherAuth.teacherId]
    });

    res.render('teacher-homework-new', {
      title: 'Post Homework',
      classes: classes.rows || [],
      error: null
    });
  } catch (error) {
    console.error('Load homework form error:', error);
    res.status(500).send(`Unable to load homework form. ${error.message}`);
  }
});

router.post('/homework/new', requireTeacherAuth, async (req, res) => {
  try {
    await ensureSchema();

    const classId = String(req.body.classId || '').trim();
    const subject = String(req.body.subject || '').trim();
    const title = String(req.body.title || '').trim();
    const description = String(req.body.description || '').trim();
    const dueDate = String(req.body.dueDate || '').trim();
    const estimatedMinutes = Number(req.body.estimatedMinutes) || 20;

    if (!classId || !subject || !title || !description || !dueDate) {
      const classes = await db.execute({
        sql: `
          SELECT id, name, year_level
          FROM classes
          WHERE teacher_id = ?
          ORDER BY year_level ASC, name ASC
        `,
        args: [req.teacherAuth.teacherId]
      });

      return res.status(400).render('teacher-homework-new', {
        title: 'Post Homework',
        classes: classes.rows || [],
        error: 'All homework fields are required.'
      });
    }

    const classResult = await db.execute({
      sql: `
        SELECT id, name
        FROM classes
        WHERE id = ?
          AND teacher_id = ?
        LIMIT 1
      `,
      args: [classId, req.teacherAuth.teacherId]
    });

    const selectedClass = classResult.rows[0];

    if (!selectedClass) {
      return res.status(403).send('You can only post homework to your own classes.');
    }

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
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `,
      args: [
        `hw-${crypto.randomUUID()}`,
        req.teacherAuth.schoolId,
        req.teacherAuth.teacherId,
        selectedClass.id,
        selectedClass.name,
        subject,
        title,
        description,
        dueDate,
        estimatedMinutes
      ]
    });

    res.redirect('/teacher/dashboard');
  } catch (error) {
    console.error('Create homework error:', error);
    res.status(500).send(`Unable to save homework. ${error.message}`);
  }
});

router.post('/claims/:id/approve', requireTeacherAuth, async (req, res) => {
  try {
    await ensureSchema();

    await db.execute({
      sql: `UPDATE credit_claims SET status = 'approved' WHERE id = ?`,
      args: [req.params.id]
    });

    res.redirect('/teacher/dashboard');
  } catch (error) {
    res.status(500).send(`Unable to approve claim. ${error.message}`);
  }
});

router.post('/claims/:id/reject', requireTeacherAuth, async (req, res) => {
  try {
    await ensureSchema();

    await db.execute({
      sql: `UPDATE credit_claims SET status = 'rejected' WHERE id = ?`,
      args: [req.params.id]
    });

    res.redirect('/teacher/dashboard');
  } catch (error) {
    res.status(500).send(`Unable to reject claim. ${error.message}`);
  }
});

module.exports = router;