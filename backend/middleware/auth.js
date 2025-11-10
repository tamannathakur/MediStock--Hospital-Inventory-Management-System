// server/middleware/auth.js
const jwt = require('jsonwebtoken');

const extractToken = (req) => {
  // prefer Authorization header
  const authHeader = req.header('authorization') || req.header('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }
  // fallback: x-auth-token
  return req.header('x-auth-token');
};

const auth = (req, res, next) => {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded.user;
    console.log("🧍 Authenticated User:", req.user); 
    next();
  } catch (err) {
    res.status(401).json({ msg: 'Token is not valid' });
  }
};

const authorize = (roles = []) => {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ msg: 'Unauthorized' });
    if (!roles.includes(req.user.role) && req.user.role !== 'hod') {
      return res.status(403).json({ msg: 'Not authorized to access this resource' });
    }
    next();
  };
};

module.exports = { auth, authorize };