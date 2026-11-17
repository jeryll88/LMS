const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');
const { requireAnyRole } = require('../middleware/role');

const router = express.Router();

// Librarians are linked to users; admin can manage, librarian can view own profile
router.use(auth);

// List all librarians (admin only)
router.get('/', requireAnyRole(['admin']), async (req, res) => {
  try {
    const result = await db.query(
      `SELECT l.*, u.email FROM librarians l JOIN users u ON l.user_id = u.id ORDER BY l.id`
    );
    res.json({ librarians: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch librarians' });
  }
});

// Get a single librarian (admin or the librarian themselves)
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const requester = req.user;
  if (requester.role !== 'admin' && requester.id !== parseInt(id)) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  try {
    const result = await db.query(
      `SELECT l.*, u.email FROM librarians l JOIN users u ON l.user_id = u.id WHERE l.id = $1`,
      [id]
    );
    if (!result.rowCount) return res.status(404).json({ message: 'Librarian not found' });
    res.json({ librarian: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch librarian' });
  }
});

// Create a librarian (admin only)
router.post('/', requireAnyRole(['admin']), async (req, res) => {
  const { user_id, employee_id, full_name, hire_date } = req.body;
  if (!user_id || !employee_id || !full_name) return res.status(400).json({ message: 'Missing fields' });
  try {
    const result = await db.query(
      `INSERT INTO librarians (user_id, employee_id, full_name, hire_date)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [user_id, employee_id, full_name, hire_date]
    );
    res.status(201).json({ librarian: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to create librarian' });
  }
});

// Update a librarian (admin only)
router.put('/:id', requireAnyRole(['admin']), async (req, res) => {
  const { id } = req.params;
  const { employee_id, full_name, hire_date } = req.body;
  try {
    const result = await db.query(
      `UPDATE librarians SET
         employee_id = COALESCE($1, employee_id),
         full_name = COALESCE($2, full_name),
         hire_date = COALESCE($3, hire_date)
       WHERE id = $4 RETURNING *`,
      [employee_id, full_name, hire_date, id]
    );
    if (!result.rowCount) return res.status(404).json({ message: 'Librarian not found' });
    res.json({ librarian: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update librarian' });
  }
});

// Delete a librarian (admin only)
router.delete('/:id', requireAnyRole(['admin']), async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query('DELETE FROM librarians WHERE id = $1 RETURNING id', [id]);
    if (!result.rowCount) return res.status(404).json({ message: 'Librarian not found' });
    res.json({ message: 'Librarian deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to delete librarian' });
  }
});

module.exports = router;
