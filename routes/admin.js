const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const db = require('../lib/turso');
const ensureSchema = require('../lib/ensureSchema');
const requireAdminAuth = require('../middleware/requireAdminAuth');

const router = express.Router();

router.get('/login', (req, res) => {
  res.render('admin-login', {
    title: 'Admin Login',
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
          AND role = 'admin'
        LIMIT 1
      `,
      args: [email]
    });

    const admin = result.rows[0];

    if (!admin || !admin.password_hash) {
      return res.status(401).render('admin-login', {
        title: 'Admin Login',
        error: 'Incorrect email or password.'
      });
    }

    const ok = await bcrypt.compare(password, admin.password_hash);

    if (!ok) {
      return res.status(401).render('admin-login', {
        title: 'Admin Login',
        error: 'Incorrect email or password.'
      });
    }

    res.cookie('admin_auth', {
      teacherId: admin.id,
      schoolId: admin.school_id,
      name: admin.name,
      role: 'admin'
    }, {
      signed: true,
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 1000 * 60 * 60 * 8,
      path: '/'
    });

    res.redirect('/admin/dashboard');
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).send(`Admin login failed. ${error.message}`);
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('admin_auth', { path: '/' });
  res.redirect('/admin/login');
});

router.get('/dashboard', requireAdminAuth, async (req, res) => {
  try {
    await ensureSchema();

    const teachers = await db.execute(`
      SELECT id, school_id, name, email, role, created_at
      FROM teachers
      ORDER BY created_at DESC
    `);

    res.render('admin-dashboard', {
      title: 'Admin Dashboard',
      teachers: teachers.rows || []
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).send(`Unable to load admin dashboard. ${error.message}`);
  }
});

router.get('/teachers/new', requireAdminAuth, (req, res) => {
  res.render('admin-teacher-new', {
    title: 'Add Teacher',
    error: null
  });
});

router.post('/teachers/new', requireAdminAuth, async (req, res) => {
  try {
    await ensureSchema();

    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const role = String(req.body.role || 'teacher').trim();

    if (!name || !email || !password) {
      return res.status(400).render('admin-teacher-new', {
        title: 'Add Teacher',
        error: 'Name, email and password are required.'
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await db.execute({
      sql: `
        INSERT INTO teachers (
          id,
          school_id,
          name,
          email,
          role,
          password_hash,
          created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      `,
      args: [
        `teacher-${crypto.randomUUID()}`,
        req.adminAuth.schoolId,
        name,
        email,
        role === 'admin' ? 'admin' : 'teacher',
        passwordHash
      ]
    });

    res.redirect('/admin/dashboard');
  } catch (error) {
    console.error('Add teacher error:', error);
    res.status(500).render('admin-teacher-new', {
      title: 'Add Teacher',
      error: `Unable to add teacher. ${error.message}`
    });
  }
});

module.exports = router;