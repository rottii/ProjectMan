const { auth } = require('../config/firebase');
const prisma = require('../lib/prisma');

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1];
  
  if (!token && req.query.token) {
    token = req.query.token;
  }
  
  if (!token) {
    return res.status(401).json({ error: 'Giriş yapmanız gerekiyor. (Authentication required)' });
  }

  try {
    const decodedToken = await auth.verifyIdToken(token);
    
    // Check if the user exists in our database by firebaseUid
    let user = await prisma.user.findUnique({
      where: { firebaseUid: decodedToken.uid }
    });
    
    // Fallback: If not found by firebaseUid, try to find by email and link them
    if (!user && decodedToken.email) {
      user = await prisma.user.findUnique({
        where: { email: decodedToken.email }
      });
      if (user) {
        user = await prisma.user.update({
          where: { email: decodedToken.email },
          data: { firebaseUid: decodedToken.uid }
        });
      }
    }

    // Attach decoded token to req.firebaseUser for routes like /sync that might need it
    req.firebaseUser = decodedToken;

    if (!user) {
      // Allow the /sync route to pass through even if the user isn't in the DB yet
      if (req.originalUrl.includes('/api/auth/sync')) {
        req.user = null;
        return next();
      }
      return res.status(401).json({ 
        error: 'Oturumunuz geçersiz veya kullanıcınız silinmiş. Lütfen tekrar giriş yapın.' 
      });
    }

    // Attach mapped payload so existing routes relying on req.user.userId continue to work
    req.user = {
      userId: user.id,
      email: user.email,
      firebaseUid: decodedToken.uid
    };
    next();
  } catch (err) {
    if (err.code === 'auth/id-token-expired') {
      return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    console.error('Auth Error:', err);
    return res.status(401).json({ error: 'Geçersiz token.' });
  }
};

module.exports = { authenticateToken };
