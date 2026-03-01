const express = require('express');
const router = express.Router();

const buyerController = require('../controllers/buyerController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');

// All buyer routes require authentication and BUYER role
router.use(authenticateToken);
router.use(authorizeRoles('BUYER'));

// Energy Listings
router.get('/listings', buyerController.getListings);
router.get('/listings/:id', buyerController.getListing);

// Purchase
router.post('/purchase', validate(schemas.purchaseEnergy), buyerController.purchaseEnergy);

// Purchase History
router.get('/history', buyerController.getPurchaseHistory);

// Dashboard
router.get('/dashboard', buyerController.getDashboard);

// Wallet
router.post('/wallet/add-funds', validate(schemas.walletAmount), buyerController.addFunds);

// Ratings
router.post('/rating', validate(schemas.createRating), buyerController.createRating);

module.exports = router;
