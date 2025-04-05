const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const authenticateJWT = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  console.log('token', token);
  if (!token) return res.status(401).send({ message: 'Access denied' });

  try {
    const user = jwt.verify(token, process.env.JWT_SECRET);

    let email = user.email;

    // Optional: Check if the token was revoked
    const result = await prisma.user.findUnique({ where: { email } });
    console.log('result====', result);
    next && next();

    if (result.email === 0)
      return res.status(403).send({ message: 'Invalid or revoked token' });

  } catch (err) {
    res.status(403).send({ message: 'Invalid token' });
  }
};

module.exports = { authenticateJWT };
