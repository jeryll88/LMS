const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');
const { requireAnyRole } = require('../middleware/role');

const router = express.Router();

// All authenticated users can view authors; admin/librarian can modify
router.use(auth);

// List all authors
router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM authors ORDER BY name');
    res.json({ authors: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch authors' });
  }
});

// Create a new author (admin/librarian only)
router.post('/', requireAnyRole(['admin', 'librarian']), async (req, res) => {
  const { name, bio } = req.body;
  if (!name) return res.status(400).json({ message: 'Name required' });
  try {
    const result = await db.query('INSERT INTO authors (name, bio) VALUES ($1, $2) RETURNING *', [name, bio]);
    res.status(201).json({ author: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to create author' });
  }
});

// Update an author (admin/librarian only)
router.put('/:id', requireAnyRole(['admin', 'librarian']), async (req, res) => {
  const { id } = req.params;
  const { name, bio } = req.body;
  try {
    const result = await db.query('UPDATE authors SET name = COALESCE($1, name), bio = COALESCE($2, bio) WHERE id = $3 RETURNING *', [name, bio, id]);
    if (!result.rowCount) return res.status(404).json({ message: 'Author not found' });
    res.json({ author: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update author' });
  }
});

// Delete an author (admin/librarian only)
router.delete('/:id', requireAnyRole(['admin', 'librarian']), async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query('DELETE FROM authors WHERE id = $1 RETURNING id', [id]);
    if (!result.rowCount) return res.status(404).json({ message: 'Author not found' });
    res.json({ message: 'Author deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to delete author' });
  }
});

module.exports = router;
