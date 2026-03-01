const express = require('express');
const router = express.Router();

const investorController = require('../controllers/investorController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');

// Unified investment routes (alias routes for frontend compatibility)
router.get(
  '/',
  authenticateToken,
  authorizeRoles('INVESTOR'),
  investorController.getInvestments
);

router.post(
  '/',
  authenticateToken,
  authorizeRoles('INVESTOR'),
  validate(schemas.investProject),
  investorController.investProject
);

module.exports = router;
