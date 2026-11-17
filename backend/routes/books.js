const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');
const { requireAnyRole } = require('../middleware/role');

const router = express.Router();

// GET /api/books - Browse & search books (Public/Authenticated)
router.get('/', async (req, res) => {
  const { search, category_id, course_id, limit, offset } = req.query;
  try {
    let sql = `
      SELECT b.book_id, b.category_id, b.isbn, b.title, b.author, b.publisher, b.publication_year, b.description, b.created_at,
             c.category_name, c.category_type,
             COUNT(bc.copy_id) AS total_copies,
             COUNT(CASE WHEN bc.status = 'Available' THEN 1 END) AS available_copies
      FROM books b
      LEFT JOIN categories c ON b.category_id = c.category_id
      LEFT JOIN book_copies bc ON b.book_id = bc.book_id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (b.title ILIKE $${params.length} OR b.author ILIKE $${params.length} OR b.isbn ILIKE $${params.length} OR b.description ILIKE $${params.length})`;
    }

    if (category_id) {
      params.push(parseInt(category_id));
      sql += ` AND b.category_id = $${params.length}`;
    }

    sql += ` GROUP BY b.book_id, c.category_name, c.category_type ORDER BY b.book_id DESC`;

    if (limit) {
      params.push(parseInt(limit));
      sql += ` LIMIT $${params.length}`;
    }
    if (offset) {
      params.push(parseInt(offset));
      sql += ` OFFSET $${params.length}`;
    }

    const result = await db.query(sql, params);
    const books = result.rows.map(r => ({
      ...r,
      id: r.book_id,
      total_copies: parseInt(r.total_copies) || 0,
      available_copies: parseInt(r.available_copies) || 0
    }));

    res.json({ books });
  } catch (err) {
    console.error('Fetch books error:', err);
    res.status(500).json({ message: 'Failed to fetch books: ' + err.message });
  }
});

// GET /api/books/:id - Get single book details with copies and status
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const bookRes = await db.query(
      `SELECT b.*, c.category_name, c.category_type
       FROM books b
       LEFT JOIN categories c ON b.category_id = c.category_id
       WHERE b.book_id = $1`,
      [id]
    );

    if (bookRes.rowCount === 0) {
      return res.status(404).json({ message: 'Book not found' });
    }

    const book = { ...bookRes.rows[0], id: bookRes.rows[0].book_id };

    // Get copies for this book
    const copiesRes = await db.query(
      `SELECT copy_id, book_id, barcode, status FROM book_copies WHERE book_id = $1 ORDER BY barcode ASC`,
      [id]
    );
    book.copies = copiesRes.rows.map(c => ({ ...c, id: c.copy_id }));

    res.json({ book });
  } catch (err) {
    console.error('Fetch book error:', err);
    res.status(500).json({ message: 'Failed to fetch book: ' + err.message });
  }
});

// POST /api/books - Add a new book (Admin or Librarian)
router.post('/', auth, requireAnyRole(['Admin', 'Librarian']), async (req, res) => {
  const { title, isbn, author, category_id, publisher, publication_year, description, initial_copies } = req.body;
  if (!title || !isbn || !author) {
    return res.status(400).json({ message: 'Title, ISBN, and Author are required' });
  }

  try {
    // Check duplicate ISBN
    const existingIsbn = await db.query('SELECT book_id FROM books WHERE isbn = $1', [isbn]);
    if (existingIsbn.rowCount > 0) {
      return res.status(400).json({ message: 'A book with this ISBN already exists.' });
    }

    await db.query('BEGIN');

    const result = await db.query(
      `INSERT INTO books (category_id, isbn, title, author, publisher, publication_year, description, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       RETURNING *`,
      [category_id ? parseInt(category_id) : null, isbn, title, author, publisher || null, publication_year ? parseInt(publication_year) : null, description || null]
    );

    const book = { ...result.rows[0], id: result.rows[0].book_id };

    // Optionally create initial physical copies
    const numCopies = parseInt(initial_copies) || 0;
    if (numCopies > 0) {
      for (let i = 1; i <= numCopies; i++) {
        const barcode = `BC-${book.book_id.toString().padStart(4, '0')}-${i.toString().padStart(2, '0')}`;
        await db.query(
          `INSERT INTO book_copies (book_id, barcode, status) VALUES ($1, $2, 'Available')`,
          [book.book_id, barcode]
        );
      }
    }

    await db.query('COMMIT');
    res.status(201).json({ book, message: `Book added successfully with ${numCopies} initial copies.` });
  } catch (err) {
    await db.query('ROLLBACK');
    console.error('Create book error:', err);
    res.status(500).json({ message: 'Failed to create book: ' + err.message });
  }
});

// PUT /api/books/:id - Update book details
router.put('/:id', auth, requireAnyRole(['Admin', 'Librarian']), async (req, res) => {
  const { id } = req.params;
  const { title, isbn, author, category_id, publisher, publication_year, description } = req.body;

  try {
    const result = await db.query(
      `UPDATE books SET
         title = COALESCE($1, title),
         isbn = COALESCE($2, isbn),
         author = COALESCE($3, author),
         category_id = COALESCE($4, category_id),
         publisher = COALESCE($5, publisher),
         publication_year = COALESCE($6, publication_year),
         description = COALESCE($7, description)
       WHERE book_id = $8
       RETURNING *`,
      [title, isbn, author, category_id ? parseInt(category_id) : null, publisher, publication_year ? parseInt(publication_year) : null, description, id]
    );

    if (result.rowCount === 0) return res.status(404).json({ message: 'Book not found' });
    const book = { ...result.rows[0], id: result.rows[0].book_id };
    res.json({ book, message: 'Book updated successfully' });
  } catch (err) {
    console.error('Update book error:', err);
    res.status(500).json({ message: 'Failed to update book: ' + err.message });
  }
});

// DELETE /api/books/:id - Delete book
router.delete('/:id', auth, requireAnyRole(['Admin', 'Librarian']), async (req, res) => {
  const { id } = req.params;
  try {
    // Check if copies are currently borrowed
    const borrowedCheck = await db.query(
      `SELECT copy_id FROM book_copies WHERE book_id = $1 AND status = 'Borrowed'`,
      [id]
    );
    if (borrowedCheck.rowCount > 0) {
      return res.status(400).json({ message: 'Cannot delete book: one or more copies are currently borrowed.' });
    }

    await db.query('BEGIN');
    await db.query('DELETE FROM borrowing_records WHERE copy_id IN (SELECT copy_id FROM book_copies WHERE book_id = $1)', [id]);
    await db.query('DELETE FROM book_copies WHERE book_id = $1', [id]);
    await db.query('DELETE FROM reservations WHERE book_id = $1', [id]);
    const delRes = await db.query('DELETE FROM books WHERE book_id = $1 RETURNING book_id', [id]);
    await db.query('COMMIT');

    if (delRes.rowCount === 0) return res.status(404).json({ message: 'Book not found' });
    res.json({ message: 'Book and its copies deleted successfully' });
  } catch (err) {
    await db.query('ROLLBACK');
    console.error('Delete book error:', err);
    res.status(500).json({ message: 'Failed to delete book: ' + err.message });
  }
});

module.exports = router;
