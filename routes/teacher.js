const express = require('express');
const router = express.Router();
const db = require('../lib/turso');

router.get('/login', (req, res) => {
  res.render('teacher-login', { title: 'Teacher Login' });
});

router.get('/dashboard', async (req, res) => {
  try {
    const result = await db.execute(`
      SELECT *
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
  res.render('teacher-homework-new', { title: 'Post Homework' });
});

router.post('/homework/new', async (req, res) => {
  try {
    const newItem = {
      id: `hw-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      className: req.body.className,
      subject: req.body.subject,
      title: req.body.title,
      description: req.body.description,
      dueDate: req.body.dueDate,
      estimatedMinutes: Number(req.body.estimatedMinutes) || 20,
      createdAt: new Date().toISOString()
    };

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
    console.error('Error creating homework:', error);
    res.status(500).send('Unable to save homework.');
  }
});

router.get('/summary', async (req, res) => {
  try {
    const result = await db.execute(`
      SELECT *
      FROM teacher_homework
      ORDER BY class_name ASC, due_date ASC
    `);

    res.render('teacher-summary', {
      title: 'Class Summary',
      homeworkItems: result.rows || []
    });
  } catch (error) {
    console.error('Error loading summary:', error);
    res.status(500).send('Unable to load class summary.');
  }
});

module.exports = router;