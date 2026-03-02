const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/signup', authController.signUp);
router.post('/signin', authController.signIn);
router.post('/logout', authController.logout);
router.get('/status', authController.status);

module.exports = router;
