const express = require('express');
const {
  loginUser,
  registerUser,
  refreshToken,
} = require('./controllers/authController');

const router = express.Router();

router.post('/login', loginUser);
router.post('/register', registerUser);
router.get('/refresh', refreshToken);

module.exports = router;
