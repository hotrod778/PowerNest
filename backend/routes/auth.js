const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');

// Public routes
router.post('/register', validate(schemas.register), authController.register);
router.post('/register/:role', validate(schemas.registerByRole), authController.registerByRole);
router.post('/login', validate(schemas.login), authController.login);

// Protected routes
router.get('/session', authenticateToken, authController.validateSession);
router.get('/profile', authenticateToken, authController.getProfile);
router.put('/profile', authenticateToken, validate(schemas.updateProfile), authController.updateProfile);
router.put('/change-password', authenticateToken, validate(schemas.changePassword), authController.changePassword);
router.post('/logout', authenticateToken, authController.logout);

module.exports = router;
