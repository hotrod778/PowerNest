const { authorizeRoles, authorizeAdmin } = require('./auth');

// Role-based middleware factory
const createRoleMiddleware = (requiredRole) => {
  return (req, res, next) => {
    authorizeRoles(requiredRole)(req, res, next);
  };
};

// Specific role middlewares
const requireSeller = createRoleMiddleware('SELLER');
const requireBuyer = createRoleMiddleware('BUYER');
const requireInvestor = createRoleMiddleware('INVESTOR');

module.exports = {
  requireSeller,
  requireBuyer,
  requireInvestor,
  requireAdmin: authorizeAdmin,
  createRoleMiddleware
};
