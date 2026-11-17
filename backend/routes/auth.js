const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

const router = express.Router();

// Helper to log activities
async function logActivity(adminId, adminUsername, targetId, targetUsername, action, details) {
  try {
    await db.query(
      `INSERT INTO activity_logs (admin_user_id, admin_username, target_user_id, target_username, action, details, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [adminId || 0, adminUsername || 'System', targetId || 0, targetUsername || 'Self', action, details]
    );
  } catch (e) {
    console.error('Activity log error:', e.message);
  }
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { username, full_name, email, password, role, student_number, gender, year_level, course_id, employee_id } = req.body;
  if (!email || !password || !full_name) {
    return res.status(400).json({ message: 'Full name, email, and password are required' });
  }

  const assignedRole = role || 'User'; // 'Admin', 'Librarian', 'User'
  const finalUsername = username || email.split('@')[0];

  try {
    // Check if email or username already exists
    const checkUser = await db.query('SELECT user_id FROM users WHERE email = $1 OR username = $2', [email, finalUsername]);
    if (checkUser.rowCount > 0) {
      return res.status(400).json({ message: 'Email or username already in use' });
    }

    let studentId = null;
    // If student info provided or role is User, insert into students table
    if (student_number || assignedRole === 'User') {
      const studentRes = await db.query(
        `INSERT INTO students (name, student_number, gender, year_level, course_id)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [full_name, student_number || `STU-${Date.now().toString().slice(-6)}`, gender || 'Not Specified', parseInt(year_level) || 1, course_id ? parseInt(course_id) : 1]
      );
      studentId = studentRes.rows[0].id;
    }

    const hashed = await bcrypt.hash(password, 10);
    const result = await db.query(
      `INSERT INTO users (student_id, username, full_name, employee_id, email, password_hash, role, is_active, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 1, NOW())
       RETURNING user_id, username, full_name, email, role, is_active, student_id`,
      [studentId, finalUsername, full_name, employee_id || null, email, hashed, assignedRole]
    );

    const user = result.rows[0];
    const token = jwt.sign(
      { id: user.user_id, user_id: user.user_id, role: user.role, email: user.email, name: user.full_name },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '8h' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });

    logActivity(user.user_id, user.username, user.user_id, user.username, 'REGISTER', `User ${user.username} registered with role ${user.role}`);

    res.status(201).json({ user, token });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ message: 'Registration failed: ' + err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

  try {
    const result = await db.query(
      `SELECT u.user_id, u.student_id, u.username, u.full_name, u.employee_id, u.email, u.password_hash, u.role, u.is_active,
              s.student_number, s.course_id, s.year_level
       FROM users u
       LEFT JOIN students s ON u.student_id = s.id
       WHERE u.email = $1 OR u.username = $1`,
      [email]
    );

    if (result.rowCount === 0) return res.status(401).json({ message: 'Invalid credentials' });
    const user = result.rows[0];

    if (user.is_active === 0) {
      return res.status(403).json({ message: 'Account is deactivated. Please contact an administrator.' });
    }

    // Support both PHP bcrypt hashes ($2y$) and Node ($2a$, $2b$)
    let compatibleHash = user.password_hash;
    if (compatibleHash.startsWith('$2y$')) {
      compatibleHash = '$2a$' + compatibleHash.slice(4);
    }

    const match = await bcrypt.compare(password, compatibleHash);
    if (!match) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user.user_id, user_id: user.user_id, role: user.role, email: user.email, name: user.full_name },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '8h' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });

    const safeUser = {
      user_id: user.user_id,
      id: user.user_id,
      student_id: user.student_id,
      username: user.username,
      full_name: user.full_name,
      employee_id: user.employee_id,
      email: user.email,
      role: user.role,
      student_number: user.student_number,
      year_level: user.year_level,
      course_id: user.course_id,
    };

    logActivity(user.user_id, user.username, user.user_id, user.username, 'LOGIN', `User ${user.username} logged in`);

    res.json({ user: safeUser, token });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Login failed: ' + err.message });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
});

// GET /api/auth/me
router.get('/me', require('../middleware/auth'), async (req, res) => {
  const userId = req.user.user_id || req.user.id;
  try {
    const result = await db.query(
      `SELECT u.user_id, u.student_id, u.username, u.full_name, u.employee_id, u.email, u.role, u.is_active, u.created_at,
              s.student_number, s.gender, s.year_level, s.course_id, c.course_code, c.course_name
       FROM users u
       LEFT JOIN students s ON u.student_id = s.id
       LEFT JOIN courses c ON s.course_id = c.id
       WHERE u.user_id = $1`,
      [userId]
    );

    if (result.rowCount === 0) return res.status(404).json({ message: 'User not found' });
    const user = result.rows[0];
    user.id = user.user_id;
    res.json({ user });
  } catch (err) {
    console.error('Auth /me error:', err);
    res.status(500).json({ message: 'Failed to fetch user: ' + err.message });
  }
});

// Password recovery stubs
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email required' });
  res.json({ message: 'If that email exists in our records, a password reset instruction has been dispatched.' });
});

router.post('/reset-password', async (req, res) => {
  res.json({ message: 'Password reset feature ready for integration.' });
});

module.exports = router;
