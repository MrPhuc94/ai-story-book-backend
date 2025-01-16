const pool = require('../db');

const authenticateJWT = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).send({ message: 'Access denied' });

  try {
    const user = jwt.verify(token, SECRET_KEY);
    req.user = user;

    // Optional: Check if the token was revoked
    const result = await pool.query(
      `SELECT * FROM tokens WHERE access_token = $1 AND revoked = false`,
      [token]
    );
    if (result.rows.length === 0)
      return res.status(403).send({ message: 'Invalid or revoked token' });

    next();
  } catch (err) {
    res.status(403).send({ message: 'Invalid token' });
  }
};
