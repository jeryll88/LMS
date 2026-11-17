const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

const router = express.Router();

// GET /api/courses - List all courses (Public so registration & catalog can display courses)
router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM courses ORDER BY course_code ASC');
    res.json({ courses: result.rows });
  } catch (err) {
    console.error('Fetch courses error:', err);
    res.status(500).json({ message: 'Failed to fetch courses: ' + err.message });
  }
});

// GET /api/courses/:id - Get course details (Public)
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query('SELECT * FROM courses WHERE id = $1', [id]);
    if (result.rowCount === 0) return res.status(404).json({ message: 'Course not found' });
    res.json({ course: result.rows[0] });
  } catch (err) {
    console.error('Fetch course error:', err);
    res.status(500).json({ message: 'Failed to fetch course: ' + err.message });
  }
});

// Protected routes (Admin only for modifications)
router.use(auth);

// POST /api/courses - Add course (Admin only)
router.post('/', requireRole('Admin'), async (req, res) => {
  const { course_code, course_name } = req.body;
  if (!course_code || !course_name) {
    return res.status(400).json({ message: 'Course code and course name are required' });
  }

  try {
    const result = await db.query(
      `INSERT INTO courses (course_code, course_name)
       VALUES ($1, $2)
       RETURNING *`,
      [course_code.toUpperCase(), course_name]
    );

    res.status(201).json({ course: result.rows[0], message: 'Course added successfully' });
  } catch (err) {
    console.error('Create course error:', err);
    res.status(500).json({ message: 'Failed to create course: ' + err.message });
  }
});

// PUT /api/courses/:id - Update course (Admin only)
router.put('/:id', requireRole('Admin'), async (req, res) => {
  const { id } = req.params;
  const { course_code, course_name } = req.body;

  try {
    const result = await db.query(
      `UPDATE courses SET
         course_code = COALESCE($1, course_code),
         course_name = COALESCE($2, course_name)
       WHERE id = $3
       RETURNING *`,
      [course_code ? course_code.toUpperCase() : null, course_name, id]
    );

    if (result.rowCount === 0) return res.status(404).json({ message: 'Course not found' });
    res.json({ course: result.rows[0], message: 'Course updated successfully' });
  } catch (err) {
    console.error('Update course error:', err);
    res.status(500).json({ message: 'Failed to update course: ' + err.message });
  }
});

// DELETE /api/courses/:id - Delete course (Admin only)
router.delete('/:id', requireRole('Admin'), async (req, res) => {
  const { id } = req.params;
  try {
    // Check if students are enrolled in this course
    const studentCheck = await db.query('SELECT id FROM students WHERE course_id = $1', [id]);
    if (studentCheck.rowCount > 0) {
      return res.status(400).json({ message: 'Cannot delete course: Students are actively associated with it.' });
    }

    const result = await db.query('DELETE FROM courses WHERE id = $1 RETURNING id', [id]);
    if (result.rowCount === 0) return res.status(404).json({ message: 'Course not found' });
    res.json({ message: 'Course deleted successfully' });
  } catch (err) {
    console.error('Delete course error:', err);
    res.status(500).json({ message: 'Failed to delete course: ' + err.message });
  }
});

module.exports = router;
