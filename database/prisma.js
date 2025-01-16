const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createToken(userEmail, accessToken, refreshToken, expiresAt) {
  return await prisma.token.create({
    data: {
      userEmail,
      accessToken,
      refreshToken,
      expiresAt,
    },
  });
}

// Example usage:
// createToken(
//   'user@example.com',
//   'access-token-string',
//   'refresh-token-string',
//   new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
// )
//   .then((token) => console.log('Token created:', token))
//   .catch((error) => console.error(error));


/*
 * Validate or Retrieve Tokens
 */

async function getValidRefreshToken(refreshToken, newExpiresAt) {
  return await prisma.token.findFirst({
    where: {
      refreshToken,
      revoked: false,
      expiresAt: newExpiresAt,
    },
  });
}

// Example usage:
// getValidRefreshToken('refresh-token-string')
//   .then((token) => {
//     if (token) {
//       console.log('Valid token:', token);
//     } else {
//       console.log('Token is invalid or expired');
//     }
//   })
//   .catch((error) => console.error(error));

  //**
  // Revoke Tokens
  //  */

  async function revokeToken(refreshToken) {
    return await prisma.token.updateMany({
      where: { refreshToken },
      data: { revoked: true },
    });
  }

  // Example usage:
//   revokeToken('refresh-token-string')
//     .then(() => console.log('Token revoked'))
//     .catch((error) => console.error(error));


module.exports = { createToken , getValidRefreshToken, revokeToken};