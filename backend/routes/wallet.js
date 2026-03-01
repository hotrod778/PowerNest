const express = require('express');
const router = express.Router();

const walletController = require('../controllers/walletController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/summary', walletController.getWalletSummary);
router.get('/ledger', walletController.getWalletLedger);

module.exports = router;
