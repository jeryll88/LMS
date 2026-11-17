const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

const router = express.Router();

// Admin only – view all activity logs
router.use(auth, requireRole('admin'));

router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM activity_logs ORDER BY created_at DESC');
    res.json({ logs: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch activity logs' });
  }
});

module.exports = router;
