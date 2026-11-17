const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

router.use(auth);

// GET /api/notifications - User's notifications
router.get('/', async (req, res) => {
  const currentUserId = req.user.user_id || req.user.id;
  try {
    const result = await db.query(
      `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20`,
      [currentUserId]
    );
    res.json({ notifications: result.rows });
  } catch (err) {
    console.error('Fetch notifications error:', err);
    res.status(500).json({ message: 'Failed to fetch notifications: ' + err.message });
  }
});

// PUT /api/notifications/:id/read - Mark notification as read
router.put('/:id/read', async (req, res) => {
  const { id } = req.params;
  const currentUserId = req.user.user_id || req.user.id;
  try {
    await db.query('UPDATE notifications SET is_read = 1 WHERE id = $1 AND user_id = $2', [id, currentUserId]);
    res.json({ message: 'Marked as read' });
  } catch (err) {
    console.error('Notification read error:', err);
    res.status(500).json({ message: 'Failed to update notification: ' + err.message });
  }
});

// PUT /api/notifications/read-all - Mark all as read
router.put('/read-all', async (req, res) => {
  const currentUserId = req.user.user_id || req.user.id;
  try {
    await db.query('UPDATE notifications SET is_read = 1 WHERE user_id = $1', [currentUserId]);
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    console.error('Mark all read error:', err);
    res.status(500).json({ message: 'Failed to update notifications: ' + err.message });
  }
});

module.exports = router;
