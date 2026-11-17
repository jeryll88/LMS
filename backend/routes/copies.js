const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');
const { requireAnyRole } = require('../middleware/role');

const router = express.Router();

// GET /api/copies - List physical book copies
router.get('/', auth, requireAnyRole(['Admin', 'Librarian']), async (req, res) => {
  const { book_id, status, search, sort } = req.query;
  try {
    let sql = `
      SELECT bc.copy_id, bc.book_id, bc.barcode, bc.status,
             b.title AS book_title, b.isbn, b.author
      FROM book_copies bc
      JOIN books b ON bc.book_id = b.book_id
      WHERE 1=1
    `;
    const params = [];

    if (book_id) {
      params.push(parseInt(book_id));
      sql += ` AND bc.book_id = $${params.length}`;
    }

    if (status) {
      params.push(status);
      sql += ` AND LOWER(bc.status) = LOWER($${params.length})`;
    }

    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (bc.barcode ILIKE $${params.length} OR b.title ILIKE $${params.length} OR b.isbn ILIKE $${params.length} OR b.author ILIKE $${params.length})`;
    }

    if (sort === 'desc') {
      sql += ' ORDER BY bc.copy_id DESC';
    } else {
      sql += ' ORDER BY bc.copy_id ASC';
    }

    const result = await db.query(sql, params);
    const copies = result.rows.map(r => ({
      ...r,
      id: r.copy_id,
      copy_code: 'C' + String(r.copy_id).padStart(3, '0')
    }));
    res.json({ copies });
  } catch (err) {
    console.error('Fetch copies error:', err);
    res.status(500).json({ message: 'Failed to fetch copies: ' + err.message });
  }
});

// GET /api/copies/:id
router.get('/:id', auth, requireAnyRole(['Admin', 'Librarian']), async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query(
      `SELECT bc.*, b.title AS book_title, b.isbn, b.author
       FROM book_copies bc
       JOIN books b ON bc.book_id = b.book_id
       WHERE bc.copy_id = $1`,
      [id]
    );

    if (result.rowCount === 0) return res.status(404).json({ message: 'Copy not found' });
    const copy = { ...result.rows[0], id: result.rows[0].copy_id };
    res.json({ copy });
  } catch (err) {
    console.error('Fetch copy error:', err);
    res.status(500).json({ message: 'Failed to fetch copy: ' + err.message });
  }
});

// POST /api/copies - Add new physical copy (supports single or batch copies)
router.post('/', auth, requireAnyRole(['Admin', 'Librarian']), async (req, res) => {
  const { book_id, barcode, status, quantity } = req.body;
  if (!book_id) return res.status(400).json({ message: 'Book ID is required' });

  try {
    const bookCheck = await db.query('SELECT book_id, title FROM books WHERE book_id = $1', [book_id]);
    if (bookCheck.rowCount === 0) return res.status(404).json({ message: 'Referenced book not found' });

    const qty = Math.min(Math.max(parseInt(quantity) || 1, 1), 50);

    // If single copy and user specified a custom barcode
    if (qty === 1 && barcode && barcode.trim()) {
      const cleanBarcode = barcode.trim();
      const barcodeCheck = await db.query('SELECT copy_id FROM book_copies WHERE barcode = $1', [cleanBarcode]);
      if (barcodeCheck.rowCount > 0) {
        return res.status(400).json({ message: 'A copy with this barcode already exists' });
      }

      const result = await db.query(
        `INSERT INTO book_copies (book_id, barcode, status)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [book_id, cleanBarcode, status || 'Available']
      );

      const copy = {
        ...result.rows[0],
        id: result.rows[0].copy_id,
        copy_code: 'C' + String(result.rows[0].copy_id).padStart(3, '0')
      };
      return res.status(201).json({ copy, message: 'Physical copy registered successfully' });
    }

    // Auto-generate barcodes for qty copies
    const countRes = await db.query('SELECT COUNT(*) FROM book_copies WHERE book_id = $1', [book_id]);
    let currentCount = parseInt(countRes.rows[0].count);

    const insertedCopies = [];
    for (let i = 0; i < qty; i++) {
      currentCount++;
      let finalBarcode = `BC-${book_id.toString().padStart(4, '0')}-${currentCount.toString().padStart(2, '0')}`;
      let check = await db.query('SELECT copy_id FROM book_copies WHERE barcode = $1', [finalBarcode]);
      if (check.rowCount > 0) {
        finalBarcode = `BC-${book_id.toString().padStart(4, '0')}-${Date.now().toString().slice(-4)}${i}`;
      }
      const result = await db.query(
        `INSERT INTO book_copies (book_id, barcode, status)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [book_id, finalBarcode, status || 'Available']
      );
      insertedCopies.push({
        ...result.rows[0],
        id: result.rows[0].copy_id,
        copy_code: 'C' + String(result.rows[0].copy_id).padStart(3, '0')
      });
    }

    res.status(201).json({
      copies: insertedCopies,
      copy: insertedCopies[0],
      message: `${qty} ${qty === 1 ? 'copy' : 'copies'} registered successfully`
    });
  } catch (err) {
    console.error('Create copy error:', err);
    res.status(500).json({ message: 'Failed to add copy: ' + err.message });
  }
});

// PUT /api/copies/:id - Update copy status or barcode
router.put('/:id', auth, requireAnyRole(['Admin', 'Librarian']), async (req, res) => {
  const { id } = req.params;
  const { status, barcode } = req.body;

  try {
    const result = await db.query(
      `UPDATE book_copies SET
         status = COALESCE($1, status),
         barcode = COALESCE($2, barcode)
       WHERE copy_id = $3
       RETURNING *`,
      [status, barcode, id]
    );

    if (result.rowCount === 0) return res.status(404).json({ message: 'Copy not found' });
    const copy = { ...result.rows[0], id: result.rows[0].copy_id };
    res.json({ copy, message: 'Copy updated successfully' });
  } catch (err) {
    console.error('Update copy error:', err);
    res.status(500).json({ message: 'Failed to update copy: ' + err.message });
  }
});

// DELETE /api/copies/:id - Delete copy
router.delete('/:id', auth, requireAnyRole(['Admin', 'Librarian']), async (req, res) => {
  const { id } = req.params;
  try {
    // Cannot delete if copy is currently borrowed
    const borrowCheck = await db.query(
      "SELECT borrow_id FROM borrowing_records WHERE copy_id = $1 AND status = 'Borrowed'",
      [id]
    );
    if (borrowCheck.rowCount > 0) {
      return res.status(400).json({ message: 'Cannot delete copy: It is currently checked out to a borrower.' });
    }

    const result = await db.query('DELETE FROM book_copies WHERE copy_id = $1 RETURNING copy_id', [id]);
    if (result.rowCount === 0) return res.status(404).json({ message: 'Copy not found' });
    res.json({ message: 'Physical copy deleted successfully' });
  } catch (err) {
    console.error('Delete copy error:', err);
    res.status(500).json({ message: 'Failed to delete copy: ' + err.message });
  }
});

module.exports = router;
