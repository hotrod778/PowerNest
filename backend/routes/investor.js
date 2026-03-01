const express = require('express');
const router = express.Router();

const investorController = require('../controllers/investorController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');

// All investor routes require authentication and INVESTOR role
router.use(authenticateToken);
router.use(authorizeRoles('INVESTOR'));

// Projects
router.get('/projects', investorController.getProjects);
router.get('/projects/:id', investorController.getProject);

// Investments
router.post('/invest', validate(schemas.investProject), investorController.investProject);
router.get('/investments', investorController.getInvestments);

// Dashboard
router.get('/dashboard', investorController.getDashboard);

// Wallet
router.post('/wallet/add-funds', validate(schemas.walletAmount), investorController.addFunds);
router.post('/wallet/withdraw', validate(schemas.createWithdrawalRequest), investorController.withdrawEarnings);
router.get('/wallet/withdraw-requests', investorController.getWithdrawRequests);

module.exports = router;
