// authenticateToken.js

import jwt from 'jsonwebtoken';

export const authenticateToken = (req, res, next) => {
  const token = req.cookies.jwt;

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  jwt.verify(token, 'mariobanda', (err, user) => {
    if (err) {
      // Check if the token has expired
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token has expired' });
      }

      return res.status(401).json({ error: 'Unauthorized' });
    }

    req.user = user;
    next();
  });
};

