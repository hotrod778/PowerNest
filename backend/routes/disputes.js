const express = require('express');
const router = express.Router();

const disputeController = require('../controllers/disputeController');
const { authenticateToken } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');

router.use(authenticateToken);

router.get('/mine', disputeController.getMyDisputes);
router.post('/', validate(schemas.createDispute), disputeController.createDispute);

module.exports = router;
