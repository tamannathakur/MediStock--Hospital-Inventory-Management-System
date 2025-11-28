const jwt = require("jsonwebtoken");

const extractToken = (req) => {
  const authHeader = req.header("authorization") || req.header("Authorization");
  if (authHeader && authHeader.startsWith("Bearer "))
    return authHeader.split(" ")[1];

  return req.header("x-auth-token");
};

const auth = (req, res, next) => {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ msg: "No token, authorization denied" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    console.log("🔐 FULL TOKEN DECODED:", decoded);

    // Support both formats
    // req.user = decoded.user || decoded;

    const userId = decoded.user._id || decoded.user.id;
    req.user = { id: userId, role: decoded.user.role };

    if (!req.user?.id || !req.user?.role) {
      console.log("⚠️ Token missing id/role:", decoded);
      return res.status(401).json({ msg: "Invalid token payload" });
    }

    console.log("🔐 req.user SET:", req.user);
    next();

  } catch (err) {
    console.log("❌ Invalid Token:", err.message);
    return res.status(401).json({ msg: "Token is not valid" });
  }
};

const authorize = (roles = []) => {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ msg: "Unauthorized" });

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ msg: "Not authorized to access this resource" });
    }

    next();
  };
};

module.exports = { auth, authorize };
