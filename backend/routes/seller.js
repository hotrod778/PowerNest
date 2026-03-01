const express = require('express');
const router = express.Router();

const sellerController = require('../controllers/sellerController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');

// All seller routes require authentication and SELLER role
router.use(authenticateToken);
router.use(authorizeRoles('SELLER'));

// Energy Listings
router.post('/listing', validate(schemas.createListing), sellerController.createListing);
router.get('/listings', sellerController.myListings);
router.put('/listing/:id', validate(schemas.updateListing), sellerController.updateListing);
router.delete('/listing/:id', sellerController.deleteListing);

// Orders
router.get('/orders', sellerController.getOrders);
router.put('/orders/:id', validate(schemas.updateOrderStatus), sellerController.updateOrderStatus);

// Dashboard
router.get('/dashboard', sellerController.getDashboard);

// Projects
router.post('/project', validate(schemas.createProject), sellerController.createProject);
router.get('/projects', sellerController.getProjects);

// Wallet and payouts
router.post('/wallet/withdraw-request', validate(schemas.createWithdrawalRequest), sellerController.createWithdrawRequest);
router.get('/wallet/withdraw-requests', sellerController.getWithdrawRequests);

module.exports = router;
