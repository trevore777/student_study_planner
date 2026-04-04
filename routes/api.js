const express = require('express');
const router = express.Router();
router.get('/probe-12345', (req, res) => {
  res.send('API PROBE 12345');
});
const db = require('../lib/turso');
const ensureSchema = require('../lib/ensureSchema');
const OpenAI = require('openai');

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

router.get('/debug-env', (req, res) => {
  res.json({
    tursoUrl: process.env.TURSO_DATABASE_URL ? 'SET' : 'MISSING',
    tursoToken: process.env.TURSO_AUTH_TOKEN ? 'SET' : 'MISSING',
    openaiKey: process.env.OPENAI_API_KEY ? 'SET' : 'MISSING'
  });
});

router.get('/debug-teacher-auth', (req, res) => {
  res.json({
    teacherUsername: process.env.TEACHER_USERNAME ? 'SET' : 'MISSING',
    teacherPassword: process.env.TEACHER_PASSWORD ? 'SET' : 'MISSING',
    sessionSecret: process.env.SESSION_SECRET ? 'SET' : 'MISSING',
    loggedIn: Boolean(req.session?.isTeacherLoggedIn)
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
    th.class_name,
    th.subject,
    th.title,
    th.description,
    th.due_date,
    th.estimated_minutes,
    th.created_at,
    s.name AS school_name,
    t.name AS teacher_name,
    c.name AS class_name_linked,
    c.year_level AS class_year_level
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
      error: error.message || 'Failed to load teacher homework.'
    });
  }
});

router.post('/claim-kings-credit', async (req, res) => {
  if (!db) {
    return res.status(500).json({
      ok: false,
      error: 'Database is not configured.'
    });
  }

  try {
    await ensureSchema();

    const {
      studentName = '',
      yearLevel = '',
      challengeDays = 0,
      schoolId = 'school-001'
    } = req.body || {};

    const cleanName = String(studentName).trim();
    const cleanYear = String(yearLevel).trim();
    const cleanDays = Number(challengeDays) || 0;

    if (!cleanName) {
      return res.status(400).json({
        ok: false,
        error: 'Student name is required before claiming Kings Credit.'
      });
    }

    if (cleanDays < 21) {
      return res.status(400).json({
        ok: false,
        error: 'Kings Credit can only be claimed after 21 successful days.'
      });
    }

    const existing = await db.execute({
      sql: `
        SELECT id, status
        FROM credit_claims
        WHERE student_name = ?
          AND COALESCE(year_level, '') = ?
          AND status IN ('pending', 'approved')
        LIMIT 1
      `,
      args: [cleanName, cleanYear]
    });

    if ((existing.rows || []).length) {
      return res.json({
        ok: true,
        alreadyClaimed: true,
        message: 'A Kings Credit claim is already pending or approved for this student.'
      });
    }

    const claim = {
      id: `claim-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      schoolId,
      studentName: cleanName,
      yearLevel: cleanYear,
      challengeDays: cleanDays,
      claimedAt: new Date().toISOString(),
      status: 'pending'
    };

    await db.execute({
      sql: `
        INSERT INTO credit_claims (
          id,
          school_id,
          student_name,
          year_level,
          challenge_days,
          claimed_at,
          status
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        claim.id,
        claim.schoolId,
        claim.studentName,
        claim.yearLevel,
        claim.challengeDays,
        claim.claimedAt,
        claim.status
      ]
    });

    res.json({
      ok: true,
      message: 'Kings Credit claim submitted for teacher review.'
    });
  } catch (error) {
    console.error('Error claiming Kings Credit:', error);
    res.status(500).json({
      ok: false,
      error: error.message || 'Unable to submit Kings Credit claim.'
    });
  }
});

router.post('/tutor', async (req, res) => {
  if (!openai) {
    return res.status(500).json({
      ok: false,
      error: 'OpenAI is not configured. Check OPENAI_API_KEY.'
    });
  }

  try {
    const {
      subject = '',
      title = '',
      notes = '',
      dueDate = '',
      question = ''
    } = req.body || {};

    if (!title && !question) {
      return res.status(400).json({
        ok: false,
        error: 'A task or question is required.'
      });
    }

    const systemPrompt = `
You are a school homework tutor inside a student planner app.
Help the student understand the homework without doing the work for them.

Rules:
- explain clearly
- break work into manageable steps
- encourage the student to think
- do not provide final assessable answers
- do not write full polished submission text
- keep responses short and supportive
`;

    const userPrompt = `
Subject: ${subject}
Task title: ${title}
Task notes: ${notes}
Due date: ${dueDate}
Student question: ${question || 'Explain this homework and help me get started.'}

Respond in this structure:
1. What this task is asking
2. First steps to take
3. One helpful hint or check question
`;

    const response = await openai.responses.create({
      model: 'gpt-5.4-mini',
      input: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    });

    res.json({
      ok: true,
      reply: response.output_text || 'Sorry, I could not generate a response.'
    });
  } catch (error) {
    console.error('Tutor error:', error);
    res.status(500).json({
      ok: false,
      error: 'Unable to generate tutor response.'
    });
  }
});

module.exports = router;