const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

const cookieOptions = {
  httpOnly: true, // Secure, no JS access
  secure: process.env.NODE_ENV === 'production', // Use HTTPS in production
  sameSite: 'Strict',
};

/**
 * Login user and store tokens in cookies
 */
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(401).json({ message: 'Invalid credentials' });

    // Generate tokens
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
      expiresIn: '1h',
    });
    const refreshToken = jwt.sign(
      { id: user.id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '30d' }
    );

    // Save refresh token in DB
    await prisma.token.upsert({
      where: { id: user.id },
      update: {
        refreshToken,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
      create: {
        userId: user.id,
        refreshToken,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    // Set cookies with expiration times
    res.cookie('token', token, { ...cookieOptions, maxAge: 60 * 60 * 1000 }); // 1 hour
    res.cookie('refreshToken', refreshToken, {
      ...cookieOptions,
      maxAge: 30 * 24 * 60 * 60 * 1000,
    }); // 30 days

    res.json({
      message: 'Login successful',
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred' });
  }
};

/**
 * Register a new user
 */
const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser)
      return res.status(400).json({ message: 'Email already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await prisma.user.create({
      data: { name, email, password: hashedPassword },
    });

    res.status(201).json({
      message: 'User registered successfully',
      user: { id: newUser.id, email: newUser.email },
    });
  } catch (error) {
    res.status(500).json({ message: 'An error occurred' });
  }
};

// **REFRESH TOKEN**
const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.cookies;
    if (!refreshToken) return res.status(401).json({ message: 'Unauthorized' });

    // Verify refresh token
    jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET,
      async (err, decoded) => {
        if (err)
          return res.status(403).json({ message: 'Invalid refresh token' });

        // Check if refresh token exists in DB
        const storedToken = await prisma.token.findUnique({
          where: { refreshToken },
        });
        if (!storedToken)
          return res.status(403).json({ message: 'Token expired or revoked' });

        // Generate new access token
        const newToken = jwt.sign({ id: decoded.id }, process.env.JWT_SECRET, {
          expiresIn: '1h',
        });

        res.cookie('token', newToken, {
          ...cookieOptions,
          maxAge: 60 * 60 * 1000,
        }); // 1 hour
        res.json({ message: 'Token refreshed' });
      }
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred' });
  }
};

/**
 * Logout User
 */
const logoutUser = async (req, res) => {
  try {
    await prisma.token.deleteMany({ where: { refreshToken: req.cookies.refreshToken } });
    res.clearCookie('token');
    res.clearCookie('refreshToken');
    res.json({ message: 'Logged out' });
  } catch (error) {
    res.status(500).json({ message: 'An error occurred' });
  }
};

module.exports = { loginUser, registerUser, refreshToken, logoutUser };
