const express = require('express');
const router = express.Router();
const db = require('../lib/turso');

router.get('/login', (req, res) => {
  res.render('teacher-login', { title: 'Teacher Login' });
});

router.get('/dashboard', async (req, res) => {
  if (!db) {
    return res.status(500).send('Database is not configured. Check TURSO_DATABASE_URL and TURSO_AUTH_TOKEN.');
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

    res.render('teacher-dashboard', {
      title: 'Teacher Dashboard',
      homeworkItems: result.rows || []
    });
  } catch (error) {
    console.error('Error loading teacher dashboard:', error);
    res.status(500).send('Unable to load teacher dashboard.');
  }
});

router.get('/homework/new', (req, res) => {
  if (!db) {
    return res.status(500).send('Database is not configured. Check TURSO_DATABASE_URL and TURSO_AUTH_TOKEN.');
  }

  res.render('teacher-homework-new', { title: 'Post Homework' });
});

router.post('/homework/new', async (req, res) => {
  if (!db) {
    return res.status(500).send('Database is not configured. Check TURSO_DATABASE_URL and TURSO_AUTH_TOKEN.');
  }

  try {
    const newItem = {
      id: `hw-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      className: (req.body.className || '').trim(),
      subject: (req.body.subject || '').trim(),
      title: (req.body.title || '').trim(),
      description: (req.body.description || '').trim(),
      dueDate: (req.body.dueDate || '').trim(),
      estimatedMinutes: Number(req.body.estimatedMinutes) || 20,
      createdAt: new Date().toISOString()
    };

    if (
      !newItem.className ||
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
          class_name,
          subject,
          title,
          description,
          due_date,
          estimated_minutes,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        newItem.id,
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
    res.status(500).send('Unable to save homework.');
  }
});

router.get('/summary', async (req, res) => {
  if (!db) {
    return res.status(500).send('Database is not configured. Check TURSO_DATABASE_URL and TURSO_AUTH_TOKEN.');
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
      ORDER BY class_name ASC, due_date ASC
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