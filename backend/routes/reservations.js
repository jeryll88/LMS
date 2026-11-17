const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');
const { requireAnyRole } = require('../middleware/role');

const router = express.Router();

// Helper to push notification
async function createNotification(userId, type, title, message, link) {
  try {
    await db.query(
      `INSERT INTO notifications (user_id, type, title, message, link, is_read, created_at)
       VALUES ($1, $2, $3, $4, $5, 0, NOW())`,
      [userId, type, title, message, link || '/reservations']
    );
  } catch (e) {
    console.error('Notification error:', e.message);
  }
}

// GET /api/reservations - List reservations (Admin/Librarian view all, Student view own)
router.get('/', auth, async (req, res) => {
  const currentUserId = req.user.user_id || req.user.id;
  const role = req.user.role?.toLowerCase();
  const { status, book_id } = req.query;

  try {
    let sql = `
      SELECT r.reservation_id, r.user_id, r.book_id, r.reservation_date, r.status, r.copy_id, r.due_date,
             u.full_name AS requester_name, u.email AS requester_email, u.username AS requester_username,
             s.student_number,
             b.title AS book_title, b.author AS book_author, b.isbn,
             COUNT(CASE WHEN bc.status = 'Available' THEN 1 END) AS available_copies
      FROM reservations r
      JOIN users u ON r.user_id = u.user_id
      LEFT JOIN students s ON u.student_id = s.id
      JOIN books b ON r.book_id = b.book_id
      LEFT JOIN book_copies bc ON b.book_id = bc.book_id
      WHERE 1=1
    `;
    const params = [];

    if (role !== 'admin' && role !== 'librarian') {
      params.push(currentUserId);
      sql += ` AND r.user_id = $${params.length}`;
    }

    if (status) {
      params.push(status);
      sql += ` AND LOWER(r.status) = LOWER($${params.length})`;
    }

    if (book_id) {
      params.push(parseInt(book_id));
      sql += ` AND r.book_id = $${params.length}`;
    }

    sql += ` GROUP BY r.reservation_id, r.user_id, r.book_id, r.reservation_date, r.status, r.copy_id, r.due_date,
             u.full_name, u.email, u.username, s.student_number, b.title, b.author, b.isbn
             ORDER BY r.reservation_date DESC`;

    const result = await db.query(sql, params);
    const reservations = result.rows.map(r => ({
      ...r,
      id: r.reservation_id,
      available_copies: parseInt(r.available_copies) || 0
    }));

    res.json({ reservations });
  } catch (err) {
    console.error('Fetch reservations error:', err);
    res.status(500).json({ message: 'Failed to fetch reservations: ' + err.message });
  }
});

// POST /api/reservations - Request a book reservation
router.post('/', auth, async (req, res) => {
  const currentUserId = req.user.user_id || req.user.id;
  const role = req.user.role?.toLowerCase();
  const { book_id } = req.body;

  const targetUserId = (role === 'admin' || role === 'librarian') && req.body.user_id
    ? parseInt(req.body.user_id)
    : currentUserId;

  if (!book_id) {
    return res.status(400).json({ message: 'book_id is required' });
  }

  try {
    // Check if book exists
    const bookRes = await db.query('SELECT book_id, title FROM books WHERE book_id = $1', [book_id]);
    if (bookRes.rowCount === 0) return res.status(404).json({ message: 'Book not found' });
    const book = bookRes.rows[0];

    // Check existing pending/approved reservation for this user and book
    const existing = await db.query(
      "SELECT reservation_id FROM reservations WHERE user_id = $1 AND book_id = $2 AND status IN ('Pending', 'Approved')",
      [targetUserId, book_id]
    );
    if (existing.rowCount > 0) {
      return res.status(400).json({ message: 'You already have an active reservation for this book.' });
    }

    // All student reservations begin with 'Pending' status until approved by a librarian
    const initialStatus = 'Pending';

    const result = await db.query(
      `INSERT INTO reservations (user_id, book_id, reservation_date, status)
       VALUES ($1, $2, NOW(), $3)
       RETURNING *`,
      [targetUserId, book_id, initialStatus]
    );

    const reservation = { ...result.rows[0], id: result.rows[0].reservation_id };

    createNotification(
      targetUserId,
      'RESERVATION_CREATED',
      'Reservation Request Submitted',
      `Your reservation request for "${book.title}" is currently Pending approval by the librarian.`,
      '/reservations'
    );

    res.status(201).json({ reservation, message: 'Reservation submitted successfully and is pending librarian approval' });
  } catch (err) {
    console.error('Create reservation error:', err);
    res.status(500).json({ message: 'Failed to create reservation: ' + err.message });
  }
});

// PUT /api/reservations/:id - Update reservation status & return due date (Admin or Librarian)
router.put('/:id', auth, requireAnyRole(['Admin', 'Librarian']), async (req, res) => {
  const { id } = req.params;
  const { status, due_date } = req.body; // 'Pending', 'Approved', 'Cancelled', 'Fulfilled'

  if (!status) return res.status(400).json({ message: 'Status is required' });

  try {
    const resvCheck = await db.query(
      `SELECT r.*, b.title, u.email, u.full_name 
       FROM reservations r 
       JOIN books b ON r.book_id = b.book_id 
       JOIN users u ON r.user_id = u.user_id 
       WHERE r.reservation_id = $1`,
      [id]
    );
    if (resvCheck.rowCount === 0) return res.status(404).json({ message: 'Reservation not found' });
    const resv = resvCheck.rows[0];

    let result;
    if (due_date) {
      result = await db.query(
        `UPDATE reservations SET status = $1, due_date = $2 WHERE reservation_id = $3 RETURNING *`,
        [status, due_date, id]
      );
    } else {
      result = await db.query(
        `UPDATE reservations SET status = $1 WHERE reservation_id = $2 RETURNING *`,
        [status, id]
      );
    }

    const formattedDate = due_date ? new Date(due_date).toLocaleDateString() : (resv.due_date ? new Date(resv.due_date).toLocaleDateString() : '');

    let noteTitle = 'Reservation Status Updated';
    let noteMsg = `Your reservation status for "${resv.title}" has been updated to: ${status}.`;

    if (status === 'Approved') {
      noteTitle = 'Book Reservation Approved!';
      noteMsg = formattedDate
        ? `Great news! Your reservation for "${resv.title}" has been Approved. Return Due Date: ${formattedDate}. Please return by this date to avoid overdue penalty fees (₱10.00/day).`
        : `Your reservation for "${resv.title}" has been Approved and is ready for pickup!`;
    } else if (status === 'Fulfilled') {
      noteTitle = 'Book Issued / Borrowed';
      noteMsg = `You have picked up "${resv.title}". Please return on or before ${formattedDate || 'the designated due date'}.`;
    }

    createNotification(
      resv.user_id,
      'RESERVATION_STATUS',
      noteTitle,
      noteMsg,
      '/reservations'
    );

    res.json({
      reservation: { ...result.rows[0], id: result.rows[0].reservation_id },
      message: status === 'Approved' && formattedDate
        ? `Reservation approved! Return due date set to ${formattedDate}.`
        : `Reservation status updated to ${status}.`
    });
  } catch (err) {
    console.error('Update reservation error:', err);
    res.status(500).json({ message: 'Failed to update reservation: ' + err.message });
  }
});

// DELETE /api/reservations/:id - Cancel reservation
router.delete('/:id', auth, async (req, res) => {
  const { id } = req.params;
  const currentUserId = req.user.user_id || req.user.id;
  const role = req.user.role?.toLowerCase();

  try {
    const resv = await db.query('SELECT * FROM reservations WHERE reservation_id = $1', [id]);
    if (resv.rowCount === 0) return res.status(404).json({ message: 'Reservation not found' });

    if (role !== 'admin' && role !== 'librarian' && resv.rows[0].user_id !== currentUserId) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    await db.query("UPDATE reservations SET status = 'Cancelled' WHERE reservation_id = $1", [id]);
    res.json({ message: 'Reservation cancelled successfully' });
  } catch (err) {
    console.error('Cancel reservation error:', err);
    res.status(500).json({ message: 'Failed to cancel reservation: ' + err.message });
  }
});

module.exports = router;
