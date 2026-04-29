import express from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { db } from "../lib/db.js";

const router = express.Router();

router.get("/login", (req, res) => {
  res.render("teacher-login", {
    error: null,
    success: null
  });
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await db.execute({
      sql: `
        SELECT id, school_id, name, email, password_hash, role
        FROM teachers
        WHERE email = ?
        LIMIT 1
      `,
      args: [email]
    });

    const teacher = result.rows[0];

    if (!teacher) {
      return res.status(401).render("teacher-login", {
        error: "Invalid email or password.",
        success: null
      });
    }

    const passwordOk = await bcrypt.compare(password, teacher.password_hash);

    if (!passwordOk) {
      return res.status(401).render("teacher-login", {
        error: "Invalid email or password.",
        success: null
      });
    }

    res.cookie("teacher_auth", {
      teacherId: teacher.id,
      schoolId: teacher.school_id,
      role: teacher.role || "teacher"
    }, {
      signed: true,
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * 7
    });

    return res.redirect("/teacher/dashboard");

  } catch (err) {
    console.error("Teacher login error:", err);

    return res.status(500).render("teacher-login", {
      error: "Login failed. Please try again.",
      success: null
    });
  }
});

router.get("/add", requireTeacherAuth, async (req, res) => {
  if (req.teacherAuth.role !== "admin") {
    return res.status(403).send("Only admins can add teachers.");
  }

  res.render("add-teacher", {
    error: null,
    success: null
  });
});

router.post("/add", requireTeacherAuth, async (req, res) => {
  try {
    if (req.teacherAuth.role !== "admin") {
      return res.status(403).send("Only admins can add teachers.");
    }

    const { name, email, password, role } = req.body;

    const passwordHash = await bcrypt.hash(password, 10);

    await db.execute({
      sql: `
        INSERT INTO teachers (
          id,
          school_id,
          name,
          email,
          password_hash,
          role
        )
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      args: [
        crypto.randomUUID(),
        req.teacherAuth.schoolId,
        name,
        email,
        passwordHash,
        role || "teacher"
      ]
    });

    res.render("add-teacher", {
      error: null,
      success: "Teacher added successfully."
    });

  } catch (err) {
    console.error("Add teacher error:", err);

    res.status(500).render("add-teacher", {
      error: "Could not add teacher. The email may already exist.",
      success: null
    });
  }
});

router.post("/reset-request", async (req, res) => {
  try {
    const { email } = req.body;

    const result = await db.execute({
      sql: `
        SELECT id, email
        FROM teachers
        WHERE email = ?
        LIMIT 1
      `,
      args: [email]
    });

    const teacher = result.rows[0];

    if (teacher) {
      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 1000 * 60 * 30).toISOString();

      await db.execute({
        sql: `
          INSERT INTO password_resets 
          (id, teacher_id, token, expires_at, used)
          VALUES (?, ?, ?, ?, 0)
        `,
        args: [
          crypto.randomUUID(),
          teacher.id,
          token,
          expiresAt
        ]
      });

      const resetLink = `${process.env.APP_URL || "http://localhost:3000"}/teacher/reset-password?token=${token}`;

      console.log("PASSWORD RESET LINK:", resetLink);

      /*
        Later, connect this to Resend, SendGrid, Mailgun, etc.
        For now, the reset link appears in your Render/Vercel logs.
      */
    }

    return res.render("teacher-login", {
      error: null,
      success: "If that email exists, a reset link has been created."
    });

  } catch (err) {
    console.error("Password reset request error:", err);

    return res.status(500).render("teacher-login", {
      error: "Password reset failed. Please try again.",
      success: null
    });
  }
});

export default router;