const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');
const { requireAnyRole } = require('../middleware/role');

const router = express.Router();

// Helper to push in-system notification
async function createNotification(userId, type, title, message, link) {
  try {
    await db.query(
      `INSERT INTO notifications (user_id, type, title, message, link, is_read, created_at)
       VALUES ($1, $2, $3, $4, $5, 0, NOW())`,
      [userId, type, title, message, link || '/borrowings']
    );
  } catch (e) {
    console.error('Notification error:', e.message);
  }
}

// GET /api/borrowings - List borrowings (Admin/Librarian view all, Student view own)
router.get('/', auth, async (req, res) => {
  const currentUserId = req.user.user_id || req.user.id;
  const role = req.user.role?.toLowerCase();
  const { status, user_id, search } = req.query;

  try {
    let sql = `
      SELECT br.borrow_id, br.user_id, br.copy_id, br.issued_by, br.borrow_date, br.due_date, br.return_date, br.status, br.created_at,
             u.full_name AS borrower_name, u.email AS borrower_email, u.username AS borrower_username,
             s.student_number,
             bc.barcode,
             b.book_id, b.title AS book_title, b.author AS book_author, b.isbn
      FROM borrowing_records br
      JOIN users u ON br.user_id = u.user_id
      LEFT JOIN students s ON u.student_id = s.id
      JOIN book_copies bc ON br.copy_id = bc.copy_id
      JOIN books b ON bc.book_id = b.book_id
      WHERE 1=1
    `;
    const params = [];

    // Role filtering: Student sees only their own
    if (role !== 'admin' && role !== 'librarian') {
      params.push(currentUserId);
      sql += ` AND br.user_id = $${params.length}`;
    } else if (user_id) {
      params.push(parseInt(user_id));
      sql += ` AND br.user_id = $${params.length}`;
    }

    if (status) {
      params.push(status);
      sql += ` AND LOWER(br.status) = LOWER($${params.length})`;
    }

    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (b.title ILIKE $${params.length} OR bc.barcode ILIKE $${params.length} OR u.full_name ILIKE $${params.length} OR s.student_number ILIKE $${params.length})`;
    }

    sql += ' ORDER BY br.borrow_id DESC';

    const result = await db.query(sql, params);
    const now = new Date();
    const borrowings = result.rows.map(r => {
      const dueDate = r.due_date ? new Date(r.due_date) : null;
      const returnDate = r.return_date ? new Date(r.return_date) : null;

      let daysOverdue = 0;
      if (r.status === 'Borrowed' && dueDate && now > dueDate) {
        daysOverdue = Math.max(0, Math.ceil((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));
      } else if (r.status === 'Returned' && dueDate && returnDate && returnDate > dueDate) {
        daysOverdue = Math.max(0, Math.ceil((returnDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));
      }

      const overdueFine = daysOverdue * 10; // ₱10.00 / day penalty

      return {
        ...r,
        id: r.borrow_id,
        days_overdue: daysOverdue,
        overdue_fine: overdueFine,
        is_overdue: daysOverdue > 0,
      };
    });
    res.json({ borrowings });
  } catch (err) {
    console.error('Fetch borrowings error:', err);
    res.status(500).json({ message: 'Failed to fetch borrowing records: ' + err.message });
  }
});

// GET /api/borrowings/:id
router.get('/:id', auth, async (req, res) => {
  const { id } = req.params;
  const currentUserId = req.user.user_id || req.user.id;
  const role = req.user.role?.toLowerCase();

  try {
    const result = await db.query(
      `SELECT br.*, u.full_name AS borrower_name, u.email AS borrower_email,
              bc.barcode, b.title AS book_title, b.author AS book_author
       FROM borrowing_records br
       JOIN users u ON br.user_id = u.user_id
       JOIN book_copies bc ON br.copy_id = bc.copy_id
       JOIN books b ON bc.book_id = b.book_id
       WHERE br.borrow_id = $1`,
      [id]
    );

    if (result.rowCount === 0) return res.status(404).json({ message: 'Borrowing transaction not found' });
    const borrowing = { ...result.rows[0], id: result.rows[0].borrow_id };

    if (role !== 'admin' && role !== 'librarian' && borrowing.user_id !== currentUserId) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    res.json({ borrowing });
  } catch (err) {
    console.error('Fetch borrowing error:', err);
    res.status(500).json({ message: 'Failed to fetch borrowing details: ' + err.message });
  }
});

// POST /api/borrowings - Borrow / Issue a book copy
router.post('/', auth, async (req, res) => {
  const staffUserId = req.user.user_id || req.user.id;
  const staffRole = req.user.role?.toLowerCase();

  // If librarian/admin is issuing, borrower can be specified via user_id. If student, borrower is self.
  const borrowerUserId = (staffRole === 'admin' || staffRole === 'librarian') && req.body.user_id
    ? parseInt(req.body.user_id)
    : staffUserId;

  const { copy_id, barcode, borrow_days } = req.body;

  if (!copy_id && !barcode) {
    return res.status(400).json({ message: 'Either copy_id or barcode must be provided' });
  }

  try {
    await db.query('BEGIN');

    // Find the copy
    let copyRes;
    if (copy_id) {
      copyRes = await db.query('SELECT bc.*, b.title FROM book_copies bc JOIN books b ON bc.book_id = b.book_id WHERE bc.copy_id = $1 FOR UPDATE', [copy_id]);
    } else {
      copyRes = await db.query('SELECT bc.*, b.title FROM book_copies bc JOIN books b ON bc.book_id = b.book_id WHERE bc.barcode = $1 FOR UPDATE', [barcode]);
    }

    if (copyRes.rowCount === 0) {
      await db.query('ROLLBACK');
      return res.status(404).json({ message: 'Physical copy not found' });
    }

    const copy = copyRes.rows[0];

    // Check status
    if (copy.status !== 'Available') {
      await db.query('ROLLBACK');
      return res.status(400).json({ message: `Cannot borrow copy. Current status: ${copy.status}` });
    }

    // Check if borrower account is active
    const userCheck = await db.query('SELECT user_id, full_name, is_active FROM users WHERE user_id = $1', [borrowerUserId]);
    if (userCheck.rowCount === 0 || userCheck.rows[0].is_active === 0) {
      await db.query('ROLLBACK');
      return res.status(400).json({ message: 'Target user account is inactive or not found' });
    }

    // Check borrower active borrow limits (e.g., max 5 books)
    const activeBorrows = await db.query(
      "SELECT COUNT(*) FROM borrowing_records WHERE user_id = $1 AND status = 'Borrowed'",
      [borrowerUserId]
    );
    if (parseInt(activeBorrows.rows[0].count) >= 5) {
      await db.query('ROLLBACK');
      return res.status(400).json({ message: 'Borrowing limit reached (maximum 5 active loans permitted).' });
    }

    const days = parseInt(borrow_days) || 14;
    const borrowDate = new Date();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + days);

    // Create borrowing record
    const borrowRes = await db.query(
      `INSERT INTO borrowing_records (user_id, copy_id, issued_by, borrow_date, due_date, status, created_at)
       VALUES ($1, $2, $3, $4, $5, 'Borrowed', NOW())
       RETURNING *`,
      [borrowerUserId, copy.copy_id, (staffRole === 'admin' || staffRole === 'librarian') ? staffUserId : null, borrowDate, dueDate]
    );

    // Update physical copy status to Borrowed
    await db.query("UPDATE book_copies SET status = 'Borrowed' WHERE copy_id = $1", [copy.copy_id]);

    // If there was an approved reservation for this user and book, fulfill it
    await db.query(
      "UPDATE reservations SET status = 'Fulfilled' WHERE user_id = $1 AND book_id = $2 AND status IN ('Approved', 'Pending')",
      [borrowerUserId, copy.book_id]
    );

    await db.query('COMMIT');

    const borrowing = { ...borrowRes.rows[0], id: borrowRes.rows[0].borrow_id };

    // Send in-system notification
    createNotification(
      borrowerUserId,
      'BORROW_SUCCESS',
      'Book Borrowed Successfully',
      `You have borrowed "${copy.title}" (Barcode: ${copy.barcode}). Due date: ${dueDate.toISOString().split('T')[0]}.`,
      '/borrowings'
    );

    res.status(201).json({
      borrowing,
      message: `Book borrowed successfully. Due date is ${dueDate.toISOString().split('T')[0]}.`
    });
  } catch (err) {
    await db.query('ROLLBACK');
    console.error('Borrow error:', err);
    res.status(500).json({ message: 'Borrowing transaction failed: ' + err.message });
  }
});

// POST /api/borrowings/:id/return - Return a borrowed book
router.post('/:id/return', auth, async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('BEGIN');

    const borrowRes = await db.query(
      `SELECT br.*, bc.book_id, b.title, bc.barcode
       FROM borrowing_records br
       JOIN book_copies bc ON br.copy_id = bc.copy_id
       JOIN books b ON bc.book_id = b.book_id
       WHERE br.borrow_id = $1 FOR UPDATE`,
      [id]
    );

    if (borrowRes.rowCount === 0) {
      await db.query('ROLLBACK');
      return res.status(404).json({ message: 'Borrowing record not found' });
    }

    const record = borrowRes.rows[0];
    if (record.status === 'Returned') {
      await db.query('ROLLBACK');
      return res.status(400).json({ message: 'This book has already been returned.' });
    }

    const returnDate = new Date();

    // Update borrowing record
    await db.query(
      "UPDATE borrowing_records SET return_date = $1, status = 'Returned' WHERE borrow_id = $2",
      [returnDate, id]
    );

    // Update copy status back to Available
    await db.query("UPDATE book_copies SET status = 'Available' WHERE copy_id = $1", [record.copy_id]);

    // Check if there are pending reservations for this book, and notify the next student in queue
    const nextReservation = await db.query(
      "SELECT r.reservation_id, r.user_id FROM reservations r WHERE r.book_id = $1 AND r.status = 'Pending' ORDER BY r.reservation_date ASC LIMIT 1",
      [record.book_id]
    );

    if (nextReservation.rowCount > 0) {
      const nextUser = nextReservation.rows[0];
      await db.query("UPDATE reservations SET status = 'Approved' WHERE reservation_id = $1", [nextUser.reservation_id]);
      createNotification(
        nextUser.user_id,
        'RESERVATION_AVAILABLE',
        'Reserved Book is Now Available!',
        `Good news! "${record.title}" has been returned and is waiting for you to borrow at the library.`,
        '/reservations'
      );
    }

    await db.query('COMMIT');

    // Notify borrower of successful return
    createNotification(
      record.user_id,
      'RETURN_SUCCESS',
      'Book Returned Successfully',
      `"${record.title}" (Barcode: ${record.barcode}) has been marked as returned. Thank you!`,
      '/borrowings'
    );

    res.json({ message: 'Book successfully returned to the library.' });
  } catch (err) {
    await db.query('ROLLBACK');
    console.error('Return error:', err);
    res.status(500).json({ message: 'Failed to process return: ' + err.message });
  }
});

// POST /api/borrowings/:id/renew - Extend borrowing due date
router.post('/:id/renew', auth, async (req, res) => {
  const { id } = req.params;
  const currentUserId = req.user.user_id || req.user.id;
  const role = req.user.role?.toLowerCase();

  try {
    const borrowRes = await db.query(
      `SELECT br.*, b.title FROM borrowing_records br
       JOIN book_copies bc ON br.copy_id = bc.copy_id
       JOIN books b ON bc.book_id = b.book_id
       WHERE br.borrow_id = $1`,
      [id]
    );

    if (borrowRes.rowCount === 0) return res.status(404).json({ message: 'Borrowing record not found' });
    const record = borrowRes.rows[0];

    // Authorization
    if (role !== 'admin' && role !== 'librarian' && record.user_id !== currentUserId) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    if (record.status === 'Returned') {
      return res.status(400).json({ message: 'Cannot renew a book that has already been returned.' });
    }

    // Extend due date by 7 or 14 days
    const currentDue = new Date(record.due_date);
    const newDue = new Date(currentDue);
    newDue.setDate(newDue.getDate() + 14);

    await db.query('UPDATE borrowing_records SET due_date = $1, status = \'Borrowed\' WHERE borrow_id = $2', [newDue, id]);

    createNotification(
      record.user_id,
      'RENEW_SUCCESS',
      'Borrowing Renewed',
      `Your loan for "${record.title}" has been extended to ${newDue.toISOString().split('T')[0]}.`,
      '/borrowings'
    );

    res.json({ message: 'Loan renewed successfully.', new_due_date: newDue.toISOString().split('T')[0] });
  } catch (err) {
    console.error('Renew error:', err);
    res.status(500).json({ message: 'Failed to renew borrowing: ' + err.message });
  }
});

module.exports = router;
