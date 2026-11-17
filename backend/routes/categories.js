const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');
const { requireAnyRole } = require('../middleware/role');

const router = express.Router();

// GET /api/categories - List categories (Public for book catalog browsing)
router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM categories ORDER BY category_name ASC');
    res.json({ categories: result.rows });
  } catch (err) {
    console.error('Fetch categories error:', err);
    res.status(500).json({ message: 'Failed to fetch categories: ' + err.message });
  }
});

// GET /api/categories/:id - Get single category (Public)
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query('SELECT * FROM categories WHERE category_id = $1', [id]);
    if (result.rowCount === 0) return res.status(404).json({ message: 'Category not found' });
    res.json({ category: result.rows[0] });
  } catch (err) {
    console.error('Fetch category error:', err);
    res.status(500).json({ message: 'Failed to fetch category: ' + err.message });
  }
});

// Protect modifying routes (Staff only)
router.use(auth, requireAnyRole(['Admin', 'Librarian']));

// POST /api/categories - Add category
router.post('/', async (req, res) => {
  const { category_name, category_type, description } = req.body;
  if (!category_name) return res.status(400).json({ message: 'Category name is required' });

  try {
    const result = await db.query(
      `INSERT INTO categories (category_name, category_type, description)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [category_name, category_type || 'Academic', description || null]
    );

    res.status(201).json({ category: result.rows[0], message: 'Category created successfully' });
  } catch (err) {
    console.error('Create category error:', err);
    res.status(500).json({ message: 'Failed to create category: ' + err.message });
  }
});

// PUT /api/categories/:id - Update category
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { category_name, category_type, description } = req.body;

  try {
    const result = await db.query(
      `UPDATE categories SET
         category_name = COALESCE($1, category_name),
         category_type = COALESCE($2, category_type),
         description = COALESCE($3, description)
       WHERE category_id = $4
       RETURNING *`,
      [category_name, category_type, description, id]
    );

    if (result.rowCount === 0) return res.status(404).json({ message: 'Category not found' });
    res.json({ category: result.rows[0], message: 'Category updated successfully' });
  } catch (err) {
    console.error('Update category error:', err);
    res.status(500).json({ message: 'Failed to update category: ' + err.message });
  }
});

// DELETE /api/categories/:id - Delete category
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const bookCheck = await db.query('SELECT book_id FROM books WHERE category_id = $1 LIMIT 1', [id]);
    if (bookCheck.rowCount > 0) {
      return res.status(400).json({ message: 'Cannot delete category: Books are associated with it.' });
    }

    const result = await db.query('DELETE FROM categories WHERE category_id = $1 RETURNING category_id', [id]);
    if (result.rowCount === 0) return res.status(404).json({ message: 'Category not found' });
    res.json({ message: 'Category deleted successfully' });
  } catch (err) {
    console.error('Delete category error:', err);
    res.status(500).json({ message: 'Failed to delete category: ' + err.message });
  }
});

module.exports = router;
