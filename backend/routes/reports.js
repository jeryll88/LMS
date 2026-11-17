const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');
const { requireAnyRole } = require('../middleware/role');

const router = express.Router();

router.use(auth, requireAnyRole(['Admin', 'Librarian']));

// GET /api/reports/inventory - Inventory summary
router.get('/inventory', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT b.book_id, b.title, b.isbn, b.author, c.category_name,
             COUNT(bc.copy_id) AS total_copies,
             COUNT(CASE WHEN bc.status = 'Available' THEN 1 END) AS available,
             COUNT(CASE WHEN bc.status = 'Borrowed' THEN 1 END) AS borrowed,
             COUNT(CASE WHEN bc.status = 'Lost' THEN 1 END) AS lost,
             COUNT(CASE WHEN bc.status = 'Damaged' THEN 1 END) AS damaged
      FROM books b
      LEFT JOIN categories c ON b.category_id = c.category_id
      LEFT JOIN book_copies bc ON b.book_id = bc.book_id
      GROUP BY b.book_id, b.title, b.isbn, b.author, c.category_name
      ORDER BY b.title ASC
    `);

    res.json({ inventory: result.rows });
  } catch (err) {
    console.error('Inventory report error:', err);
    res.status(500).json({ message: 'Failed to generate inventory report: ' + err.message });
  }
});

// GET /api/reports/borrowings - Borrowing history & trends
router.get('/borrowings', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT br.borrow_id, br.borrow_date, br.due_date, br.return_date, br.status,
             u.full_name AS borrower_name, u.email AS borrower_email,
             s.student_number,
             b.title AS book_title, b.isbn, bc.barcode
      FROM borrowing_records br
      JOIN users u ON br.user_id = u.user_id
      LEFT JOIN students s ON u.student_id = s.id
      JOIN book_copies bc ON br.copy_id = bc.copy_id
      JOIN books b ON bc.book_id = b.book_id
      ORDER BY br.borrow_date DESC
    `);

    res.json({ borrowings: result.rows });
  } catch (err) {
    console.error('Borrowing report error:', err);
    res.status(500).json({ message: 'Failed to generate borrowing report: ' + err.message });
  }
});

// GET /api/reports/overdue - Overdue books list
router.get('/overdue', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT br.borrow_id, br.borrow_date, br.due_date,
             (CURRENT_DATE - br.due_date) AS days_overdue,
             u.full_name AS borrower_name, u.email AS borrower_email,
             s.student_number,
             b.title AS book_title, bc.barcode
      FROM borrowing_records br
      JOIN users u ON br.user_id = u.user_id
      LEFT JOIN students s ON u.student_id = s.id
      JOIN book_copies bc ON br.copy_id = bc.copy_id
      JOIN books b ON bc.book_id = b.book_id
      WHERE br.status = 'Borrowed' AND br.due_date < CURRENT_DATE
      ORDER BY days_overdue DESC
    `);

    res.json({ overdue: result.rows });
  } catch (err) {
    console.error('Overdue report error:', err);
    res.status(500).json({ message: 'Failed to generate overdue report: ' + err.message });
  }
});

// GET /api/reports/popular-books - Most borrowed books
router.get('/popular-books', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT b.book_id, b.title, b.author, b.isbn, c.category_name,
             COUNT(br.borrow_id) AS borrow_count
      FROM books b
      LEFT JOIN categories c ON b.category_id = c.category_id
      LEFT JOIN book_copies bc ON b.book_id = bc.book_id
      LEFT JOIN borrowing_records br ON bc.copy_id = br.copy_id
      GROUP BY b.book_id, b.title, b.author, b.isbn, c.category_name
      ORDER BY borrow_count DESC, b.title ASC
      LIMIT 10
    `);

    res.json({ popular_books: result.rows });
  } catch (err) {
    console.error('Popular books report error:', err);
    res.status(500).json({ message: 'Failed to generate popular books report: ' + err.message });
  }
});

module.exports = router;
