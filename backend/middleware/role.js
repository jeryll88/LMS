// Role matching helper supporting case variations (Admin/admin, Librarian/librarian, User/Student)
function normalizeRole(role) {
  if (!role) return '';
  const r = role.toLowerCase();
  if (r === 'student') return 'user';
  return r;
}

module.exports = {
  requireRole: (role) => {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      const userRole = normalizeRole(req.user.role);
      const targetRole = normalizeRole(role);

      if (userRole === targetRole) {
        return next();
      }
      res.status(403).json({ message: `Forbidden: requires ${role} role` });
    };
  },

  requireAnyRole: (roles) => {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      const userRole = normalizeRole(req.user.role);
      const targetRoles = roles.map(normalizeRole);

      if (targetRoles.includes(userRole)) {
        return next();
      }
      res.status(403).json({ message: `Forbidden: requires one of [${roles.join(', ')}]` });
    };
  },
};
