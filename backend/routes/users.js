const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');
const { requireRole, requireAnyRole } = require('../middleware/role');
const bcrypt = require('bcrypt');

const router = express.Router();

// GET /api/users - List users (Admin or Librarian)
router.get('/', auth, requireAnyRole(['Admin', 'Librarian']), async (req, res) => {
  const { role, search } = req.query;
  try {
    let sql = `
      SELECT u.user_id, u.student_id, u.username, u.full_name, u.employee_id, u.email, u.role, u.is_active, u.created_at,
             s.student_number, s.year_level, c.course_code
      FROM users u
      LEFT JOIN students s ON u.student_id = s.id
      LEFT JOIN courses c ON s.course_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (role) {
      params.push(role);
      sql += ` AND LOWER(u.role) = LOWER($${params.length})`;
    }

    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (u.full_name ILIKE $${params.length} OR u.email ILIKE $${params.length} OR u.username ILIKE $${params.length} OR s.student_number ILIKE $${params.length})`;
    }

    sql += ' ORDER BY u.user_id DESC';

    const result = await db.query(sql, params);
    // Format output with id = user_id
    const users = result.rows.map(r => ({ ...r, id: r.user_id }));
    res.json({ users });
  } catch (err) {
    console.error('Fetch users error:', err);
    res.status(500).json({ message: 'Failed to fetch users: ' + err.message });
  }
});

// GET /api/users/:id
router.get('/:id', auth, async (req, res) => {
  const { id } = req.params;
  const currentUserId = req.user.user_id || req.user.id;
  const currentUserRole = req.user.role?.toLowerCase();

  // Non-admins can only see their own profile
  if (currentUserRole !== 'admin' && currentUserRole !== 'librarian' && parseInt(id) !== currentUserId) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  try {
    const result = await db.query(
      `SELECT u.user_id, u.student_id, u.username, u.full_name, u.employee_id, u.email, u.role, u.is_active, u.created_at,
              s.student_number, s.gender, s.year_level, s.course_id, c.course_code, c.course_name
       FROM users u
       LEFT JOIN students s ON u.student_id = s.id
       LEFT JOIN courses c ON s.course_id = c.id
       WHERE u.user_id = $1`,
      [id]
    );

    if (result.rowCount === 0) return res.status(404).json({ message: 'User not found' });
    const user = { ...result.rows[0], id: result.rows[0].user_id };
    res.json({ user });
  } catch (err) {
    console.error('Fetch user error:', err);
    res.status(500).json({ message: 'Failed to fetch user: ' + err.message });
  }
});

// POST /api/users - Create user (Admin only)
router.post('/', auth, requireRole('Admin'), async (req, res) => {
  const { username, full_name, email, password, role, is_active, employee_id, student_number, gender, year_level, course_id } = req.body;
  if (!email || !password || !full_name) {
    return res.status(400).json({ message: 'Full name, email, and password required' });
  }

  const assignedRole = role || 'User';
  const uname = username || email.split('@')[0];

  try {
    let studentId = null;
    if (student_number || assignedRole.toLowerCase() === 'user' || assignedRole.toLowerCase() === 'student') {
      const stuRes = await db.query(
        `INSERT INTO students (name, student_number, gender, year_level, course_id)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [full_name, student_number || `STU-${Date.now().toString().slice(-6)}`, gender || 'Not Specified', parseInt(year_level) || 1, course_id ? parseInt(course_id) : 1]
      );
      studentId = stuRes.rows[0].id;
    }

    const hashed = await bcrypt.hash(password, 10);
    const result = await db.query(
      `INSERT INTO users (student_id, username, full_name, employee_id, email, password_hash, role, is_active, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
       RETURNING user_id, student_id, username, full_name, employee_id, email, role, is_active, created_at`,
      [studentId, uname, full_name, employee_id || null, email, hashed, assignedRole, is_active !== undefined ? is_active : 1]
    );

    const user = { ...result.rows[0], id: result.rows[0].user_id };
    res.status(201).json({ user });
  } catch (err) {
    console.error('Create user error:', err);
    res.status(500).json({ message: 'Failed to create user: ' + err.message });
  }
});

// PUT /api/users/:id - Update user (Admin or Librarian or Self)
router.put('/:id', auth, async (req, res) => {
  const { id } = req.params;
  const currentUserId = req.user.user_id || req.user.id;
  const currentUserRole = req.user.role?.toLowerCase();
  const isAdmin = currentUserRole === 'admin';

  if (!isAdmin && parseInt(id) !== currentUserId) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const { full_name, email, password, role, is_active, employee_id, student_number, gender, year_level, course_id } = req.body;

  try {
    const userRes = await db.query('SELECT * FROM users WHERE user_id = $1', [id]);
    if (userRes.rowCount === 0) return res.status(404).json({ message: 'User not found' });
    const existing = userRes.rows[0];

    let passwordHash = existing.password_hash;
    if (password && password.trim().length > 0) {
      passwordHash = await bcrypt.hash(password, 10);
    }

    const updatedRole = isAdmin && role ? role : existing.role;
    const updatedStatus = isAdmin && is_active !== undefined ? is_active : existing.is_active;
    const updatedEmpId = isAdmin && employee_id !== undefined ? employee_id : existing.employee_id;

    await db.query(
      `UPDATE users
       SET full_name = COALESCE($1, full_name),
           email = COALESCE($2, email),
           password_hash = $3,
           role = $4,
           is_active = $5,
           employee_id = $6
       WHERE user_id = $7`,
      [full_name, email, passwordHash, updatedRole, updatedStatus, updatedEmpId, id]
    );

    // Update associated student record if applicable
    if (existing.student_id) {
      await db.query(
        `UPDATE students
         SET name = COALESCE($1, name),
             student_number = COALESCE($2, student_number),
             gender = COALESCE($3, gender),
             year_level = COALESCE($4, year_level),
             course_id = COALESCE($5, course_id)
         WHERE id = $6`,
        [full_name, student_number, gender, year_level, course_id, existing.student_id]
      );
    }

    const result = await db.query('SELECT user_id, student_id, username, full_name, email, role, is_active, employee_id FROM users WHERE user_id = $1', [id]);
    const user = { ...result.rows[0], id: result.rows[0].user_id };
    res.json({ user, message: 'User updated successfully' });
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ message: 'Failed to update user: ' + err.message });
  }
});

// DELETE /api/users/:id - Deactivate or Delete user (Admin only)
router.delete('/:id', auth, requireRole('Admin'), async (req, res) => {
  const { id } = req.params;
  try {
    // Check if user has active borrowings
    const activeBorrows = await db.query(
      "SELECT borrow_id FROM borrowing_records WHERE user_id = $1 AND status = 'Borrowed'",
      [id]
    );
    if (activeBorrows.rowCount > 0) {
      return res.status(400).json({ message: 'Cannot delete user with unreturned books. Consider deactivating.' });
    }

    // Toggle active status or soft delete
    await db.query('UPDATE users SET is_active = 0 WHERE user_id = $1', [id]);
    res.json({ message: 'User account deactivated successfully' });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ message: 'Failed to deactivate user: ' + err.message });
  }
});

module.exports = router;
