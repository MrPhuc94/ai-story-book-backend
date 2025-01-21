const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const {
  createToken,
  getValidRefreshToken,
  revokeToken,
} = require('../../database/prisma');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const router = express.Router();
const prisma = new PrismaClient();

router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new user
    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
      },
    });

    // Generate JWT tokens
    const accessToken = jwt.sign(
      { email: newUser.email },
      process.env.JWT_SECRET,
      {
        expiresIn: '1h',
      }
    );
    const refreshToken = crypto.randomBytes(40).toString('hex');

    // Save tokens in the database
    await prisma.token.create({
      data: {
        accessToken,
        refreshToken,
        userEmail: newUser.email,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Refresh token expires in 7 days
      },
    });

    // Respond with user data and tokens
    res.status(201).json({
      user: { id: newUser.id, email: newUser.email, name: newUser.name },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred during registration' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({
    where: { email },
  });
  if (!user) return res.status(404).send({ message: 'User not found' });

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid)
    return res.status(401).send({ message: 'Invalid password' });

  const accessToken = jwt.sign(
    { email: email },
    process.env.JWT_SECRET,
    {
      expiresIn: '1h',
    }
  );
  const refreshToken = crypto.randomBytes(40).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  try {
    // handle with db
    await createToken(email, accessToken, refreshToken, expiresAt);
    res.send({ accessToken, refreshToken });
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: 'Internal server error' });
  }
});

//**
// Handle generate new token when token expired with refresh token
//  */
router.post('/token', async (req, res) => {
  const { token } = req.body;

  if (!token)
    return res.status(401).send({ message: 'Refresh token is required' });

  try {
    const result = await pool.query(
      `SELECT * FROM tokens WHERE refresh_token = $1 AND revoked = false AND expires_at > NOW()`,
      [token]
    );

    if (result.rows.length === 0) {
      return res
        .status(403)
        .send({ message: 'Invalid or expired refresh token' });
    }

    const userToken = result.rows[0];
    const newAccessToken = jwt.sign(
      { email: userToken.user_email },
      SECRET_KEY,
      { expiresIn: '15m' }
    );
    const newRefreshToken = crypto.randomBytes(40).toString('hex');
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // db
    await getValidRefreshToken(newRefreshToken, newExpiresAt);
    res.send({ accessToken: newAccessToken, refreshToken: newRefreshToken });
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: 'Internal server error' });
  }
});

//**
// Handle Revoke token when logout
//  */
router.post('/logout', async (req, res) => {
  const { token } = req.body;

  try {
    // db
    await revokeToken(token);
    res.status(200).send({ message: 'Logged out successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: 'Internal server error' });
  }
});

module.exports = router;
