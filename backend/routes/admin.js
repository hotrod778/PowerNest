const express = require('express');
const router = express.Router();

const adminController = require('../controllers/adminController');
const { authenticateToken, authorizeAdmin } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');

// All admin routes require authentication and admin privileges
router.use(authenticateToken);
router.use(authorizeAdmin);

// Analytics
router.get('/analytics', adminController.getAnalytics);

// User Management
router.get('/users', adminController.getUsers);
router.patch('/users/:id/suspend', adminController.setUserSuspension);
router.post('/approve/seller/:id', adminController.approveSeller);

// Moderation
router.get('/pending-approvals', adminController.getPendingApprovals);
router.post('/approve/listing/:id', adminController.approveListing);
router.post('/approve/project/:id', adminController.approveProject);

// Transaction and Dispute Management
router.get('/transactions', adminController.getTransactions);
router.get('/disputes', adminController.getDisputes);
router.patch('/disputes/:id', validate(schemas.resolveDispute), adminController.resolveDispute);

// Withdrawals
router.get('/withdrawals', adminController.getWithdrawals);
router.patch('/withdrawals/:id', validate(schemas.reviewWithdrawalRequest), adminController.reviewWithdrawal);

// Commission settings
router.get('/settings/commissions', adminController.getCommissionSettings);
router.patch('/settings/commissions', validate(schemas.updateCommissionSettings), adminController.updateCommissionSettings);

// System Health
router.get('/health', adminController.getSystemHealth);

module.exports = router;
