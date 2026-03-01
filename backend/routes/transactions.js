const express = require('express');
const router = express.Router();

const sellerController = require('../controllers/sellerController');
const buyerController = require('../controllers/buyerController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');

// Unified transactions routes (alias routes for frontend compatibility)
router.get(
  '/',
  authenticateToken,
  authorizeRoles('SELLER', 'BUYER'),
  (req, res, next) => {
    if (req.user.role === 'BUYER') {
      return buyerController.getPurchaseHistory(req, res, next);
    }
    return sellerController.getOrders(req, res, next);
  }
);

router.post(
  '/',
  authenticateToken,
  authorizeRoles('BUYER'),
  validate(schemas.purchaseEnergy),
  buyerController.purchaseEnergy
);

module.exports = router;
