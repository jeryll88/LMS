const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');
const { requireAnyRole } = require('../middleware/role');

const router = express.Router();

// Students are linked to users; admin & librarian can manage
router.use(auth, requireAnyRole(['admin', 'librarian']));

// List all students
router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT s.*, u.user_id, u.email, u.username, u.full_name, u.is_active, c.name AS course_name, c.code AS course_code 
       FROM students s 
       LEFT JOIN users u ON u.student_id = s.id 
       LEFT JOIN courses c ON s.course_id = c.id
       ORDER BY s.id`
    );
    res.json({ students: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch students' });
  }
});

// Get a single student
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query(
      `SELECT s.*, u.user_id, u.email, u.username, u.full_name, u.is_active, c.name AS course_name, c.code AS course_code 
       FROM students s 
       LEFT JOIN users u ON u.student_id = s.id 
       LEFT JOIN courses c ON s.course_id = c.id
       WHERE s.id = $1`,
      [id]
    );
    if (!result.rowCount) return res.status(404).json({ message: 'Student not found' });
    res.json({ student: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch student' });
  }
});

// Create a student (admin only)
router.post('/', requireAnyRole(['admin']), async (req, res) => {
  const { user_id, student_number, full_name, enrollment_date } = req.body;
  if (!user_id || !student_number || !full_name) return res.status(400).json({ message: 'Missing fields' });
  try {
    const result = await db.query(
      `INSERT INTO students (user_id, student_number, full_name, enrollment_date)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [user_id, student_number, full_name, enrollment_date]
    );
    res.status(201).json({ student: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to create student' });
  }
});

// Update a student (admin only)
router.put('/:id', requireAnyRole(['admin']), async (req, res) => {
  const { id } = req.params;
  const { student_number, full_name, enrollment_date } = req.body;
  try {
    const result = await db.query(
      `UPDATE students SET
         student_number = COALESCE($1, student_number),
         full_name = COALESCE($2, full_name),
         enrollment_date = COALESCE($3, enrollment_date)
       WHERE id = $4 RETURNING *`,
      [student_number, full_name, enrollment_date, id]
    );
    if (!result.rowCount) return res.status(404).json({ message: 'Student not found' });
    res.json({ student: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update student' });
  }
});

// Delete a student (admin only)
router.delete('/:id', requireAnyRole(['admin']), async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query('DELETE FROM students WHERE id = $1 RETURNING id', [id]);
    if (!result.rowCount) return res.status(404).json({ message: 'Student not found' });
    res.json({ message: 'Student deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to delete student' });
  }
});

module.exports = router;
