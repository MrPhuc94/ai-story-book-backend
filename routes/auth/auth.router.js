const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { createToken, getValidRefreshToken, revokeToken } = require('../../database/prisma');
const router = express.Router();

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = users.find((u) => u.email === email);
  if (!user) return res.status(404).send({ message: 'User not found' });

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid)
    return res.status(401).send({ message: 'Invalid password' });

  const accessToken = jwt.sign({ email: user.email }, SECRET_KEY, {
    expiresIn: '15m',
  });
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
    await revokeToken(token)
    res.status(200).send({ message: 'Logged out successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: 'Internal server error' });
  }
});


module.exports = router;