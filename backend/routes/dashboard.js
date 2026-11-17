const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

router.use(auth);

// GET /api/dashboard/metrics - Role-specific metrics from live DB
router.get('/metrics', async (req, res) => {
  const currentUserId = req.user.user_id || req.user.id;
  const role = req.user.role?.toLowerCase();

  try {
    if (role === 'admin') {
      const counts = await db.query(`
        SELECT
          (SELECT COUNT(*) FROM users) AS total_users,
          (SELECT COUNT(*) FROM users WHERE LOWER(role) = 'user') AS total_students,
          (SELECT COUNT(*) FROM users WHERE LOWER(role) = 'librarian') AS total_librarians,
          (SELECT COUNT(*) FROM books) AS total_book_titles,
          (SELECT COUNT(*) FROM book_copies) AS total_copies,
          (SELECT COUNT(*) FROM book_copies WHERE status = 'Available') AS available_copies,
          (SELECT COUNT(*) FROM book_copies WHERE status = 'Borrowed') AS borrowed_copies,
          (SELECT COUNT(*) FROM borrowing_records WHERE status = 'Borrowed' AND due_date < CURRENT_DATE) AS overdue_books,
          (SELECT COUNT(*) FROM reservations WHERE status = 'Pending') AS pending_reservations
      `);
      return res.json({ metrics: counts.rows[0], role: 'admin' });
    }

    if (role === 'librarian') {
      const counts = await db.query(`
        SELECT
          (SELECT COUNT(*) FROM books) AS total_books,
          (SELECT COUNT(*) FROM book_copies WHERE status = 'Available') AS available_copies,
          (SELECT COUNT(*) FROM book_copies WHERE status = 'Borrowed') AS borrowed_copies,
          (SELECT COUNT(*) FROM borrowing_records WHERE status = 'Borrowed') AS active_borrowings,
          (SELECT COUNT(*) FROM borrowing_records WHERE status = 'Borrowed' AND due_date < CURRENT_DATE) AS overdue_transactions,
          (SELECT COUNT(*) FROM reservations WHERE status = 'Pending') AS pending_reservations
      `);
      return res.json({ metrics: counts.rows[0], role: 'librarian' });
    }

    // Default: Student / User
    const counts = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM borrowing_records WHERE user_id = $1 AND status = 'Borrowed') AS currently_borrowed,
        (SELECT COUNT(*) FROM borrowing_records WHERE user_id = $1 AND status = 'Borrowed' AND due_date < CURRENT_DATE) AS overdue_books,
        (SELECT COUNT(*) FROM reservations WHERE user_id = $1 AND status IN ('Pending', 'Approved')) AS active_reservations,
        (SELECT COUNT(*) FROM borrowing_records WHERE user_id = $1) AS total_borrowing_history
    `, [currentUserId]);

    return res.json({ metrics: counts.rows[0], role: 'student' });
  } catch (err) {
    console.error('Metrics error:', err);
    res.status(500).json({ message: 'Failed to fetch metrics: ' + err.message });
  }
});

// GET /api/dashboard/activities - Recent system or user activities
router.get('/activities', async (req, res) => {
  const currentUserId = req.user.user_id || req.user.id;
  const role = req.user.role?.toLowerCase();

  try {
    if (role === 'admin' || role === 'librarian') {
      const logs = await db.query(
        `SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 15`
      );
      return res.json({ activities: logs.rows });
    }

    // Student: recent borrowing and reservation events
    const borrows = await db.query(
      `SELECT br.borrow_id, br.borrow_date, br.due_date, br.return_date, br.status, b.title AS book_title
       FROM borrowing_records br
       JOIN book_copies bc ON br.copy_id = bc.copy_id
       JOIN books b ON bc.book_id = b.book_id
       WHERE br.user_id = $1
       ORDER BY br.created_at DESC LIMIT 10`,
      [currentUserId]
    );

    return res.json({ activities: borrows.rows });
  } catch (err) {
    console.error('Activities error:', err);
    res.status(500).json({ message: 'Failed to fetch activities: ' + err.message });
  }
});

module.exports = router;
