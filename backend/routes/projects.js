const express = require('express');
const router = express.Router();

const sellerController = require('../controllers/sellerController');
const investorController = require('../controllers/investorController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');

// Unified project routes (alias routes for frontend compatibility)
router.get(
  '/',
  authenticateToken,
  authorizeRoles('SELLER', 'INVESTOR'),
  (req, res, next) => {
    if (req.user.role === 'INVESTOR') {
      return investorController.getProjects(req, res, next);
    }
    return sellerController.getProjects(req, res, next);
  }
);

router.post(
  '/',
  authenticateToken,
  authorizeRoles('SELLER'),
  validate(schemas.createProject),
  sellerController.createProject
);

module.exports = router;
