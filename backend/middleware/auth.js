const jwt = require('jsonwebtoken');
const { prisma } = require('../config/database');

const buildRequestUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  wallet_balance: user.wallet_balance,
  is_admin: user.is_admin,
  is_verified: user.is_verified,
  is_suspended: user.is_suspended,
});

// Verify JWT token
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      error: 'Access denied',
      message: 'No token provided'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id || decoded.userId;

    if (!userId) {
      return res.status(401).json({
        error: 'Invalid token',
        message: 'Token payload is invalid'
      });
    }
    
    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        wallet_balance: true,
        is_admin: true,
        is_verified: true,
        is_suspended: true,
      }
    });

    if (!user) {
      return res.status(401).json({
        error: 'Invalid token',
        message: 'User not found'
      });
    }

    if (user.is_suspended) {
      return res.status(403).json({
        error: 'Account suspended',
        message: 'Your account is suspended. Please contact support.',
      });
    }

    req.user = buildRequestUser(user);
    
    next();
  } catch (error) {
    return res.status(401).json({
      error: 'Invalid token',
      message: 'Token is not valid'
    });
  }
};

// Role-based access control
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    const normalizedRoles = roles.map((role) => String(role || '').toUpperCase());
    const hasRole = normalizedRoles.includes(req.user.role);
    const adminAllowed = normalizedRoles.includes('ADMIN') && req.user.is_admin;

    if (!hasRole && !adminAllowed) {
      return res.status(403).json({
        error: 'Access denied',
        message: `Role ${req.user.role} is not authorized to access this resource`
      });
    }
    next();
  };
};

const authorizeAdmin = (req, res, next) => {
  if (!req.user?.is_admin) {
    return res.status(403).json({
      error: 'Access denied',
      message: 'Administrator access is required for this resource',
    });
  }

  next();
};

// Optional authentication (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id || decoded.userId;

    if (!userId) {
      req.user = null;
      return next();
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        wallet_balance: true,
        is_admin: true,
        is_verified: true,
        is_suspended: true,
      }
    });

    // Attach user object with id and role to request
    if (user && !user.is_suspended) {
      req.user = buildRequestUser(user);
    } else {
      req.user = null;
    }
  } catch (error) {
    req.user = null;
  }
  
  next();
};

module.exports = {
  authenticateToken,
  authorizeRoles,
  authorizeAdmin,
  optionalAuth
};
