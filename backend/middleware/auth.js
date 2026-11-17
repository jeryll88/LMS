const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const token = req.cookies?.token || (req.headers['authorization']?.startsWith('Bearer ') ? req.headers['authorization'].split(' ')[1] : req.headers['authorization']);
  if (!token) return res.status(401).json({ message: 'Authentication required. No token provided.' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    req.user = decoded; // { id, user_id, role, email, name }
    next();
  } catch (err) {
    console.error('JWT verification error:', err.message);
    res.status(401).json({ message: 'Invalid or expired session token.' });
  }
};
