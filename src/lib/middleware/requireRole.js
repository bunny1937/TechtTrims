// lib/middleware/requireRole.js
const jwt = require('jsonwebtoken');
function requireRole(handler, allowedRoles = []) {
  return async (req, res) => {
    try {
      const auth = req.headers.authorization || '';
      const token = auth.replace('Bearer ', '');
      if (!token) return res.status(401).json({ message: 'Token required' });
      const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev_jwt_secret');
      if (!allowedRoles.includes(payload.role)) {
        return res.status(403).json({ message: 'Insufficient privileges' });
      }
      req.user = payload;
      return handler(req, res);
    } catch (err) {
      return res.status(401).json({ message: 'Invalid or missing token', error: String(err) });
    }
  };
}
module.exports = { requireRole };
