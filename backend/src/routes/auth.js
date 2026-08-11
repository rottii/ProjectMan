const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
const prisma = require('../lib/prisma');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for profile photos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '..', '..', 'uploads', 'avatars');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

const { JWT_SECRET } = require('../config/env');
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

// Helper function to generate tokens and session
async function generateTokens(userId, rememberMe = false) {
  // Generate short-lived access token (e.g. 1 hour)
  const accessToken = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '1h' });
  
  // Generate a cryptographically secure random string for the refresh token
  const refreshToken = crypto.randomBytes(40).toString('hex');
  
  // Expiry for refresh token (30 days if rememberMe, otherwise 1 day)
  const days = rememberMe ? 30 : 1;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + days);

  // Save session in DB
  await prisma.session.create({
    data: {
      userId,
      refreshToken,
      expiresAt
    }
  });

  return { accessToken, refreshToken };
}

// 0. GOOGLE ILE GIRIŞ YAP VEYA KAYIT OL - POST /api/auth/google
router.post('/google', async (req, res) => {
  try {
    const { token, rememberMe } = req.body;
    if (!token) {
      return res.status(400).json({ error: 'Google token is required.' });
    }

    // Verify token with Google
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: GOOGLE_CLIENT_ID,
    });
    
    const payload = ticket.getPayload();
    const { sub: googleId, email, name } = payload;

    // Check if user exists by googleId OR email
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { googleId: googleId },
          { email: email }
        ]
      }
    });

    if (user) {
      // If user exists by email but doesn't have googleId linked, link it now
      if (!user.googleId) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { googleId: googleId }
        });
      }
    } else {
      // User doesn't exist, create them
      user = await prisma.user.create({
        data: {
          email,
          name,
          googleId,
        },
      });

      // Otomatik olarak Workspace ve Team oluşturma
      const workspace = await prisma.workspace.create({
        data: {
          name: `${user.name}'s Workspace`,
          members: {
            create: { userId: user.id, role: 'ADMIN' }
          },
          teams: {
            create: {
              name: 'Work',
              description: 'Default team',
              members: {
                create: { userId: user.id, role: 'ADMIN' }
              }
            }
          }
        },
        include: { teams: true }
      });

      const teamId = workspace.teams[0].id;

      // Otomatik olarak "My Tasks" projesi oluşturma (Aynı Register gibi)
      await prisma.project.create({
        data: {
          name: 'My Tasks',
          status: 'MY_TASKS',
          ownerId: user.id,
          workspaceId: workspace.id,
          teamId: teamId,
          color: '#4F46E5',
          icon: '👤',
          sections: {
            create: [
              { name: 'Recently assigned', order: 1000 },
              { name: 'Do today', order: 2000 },
              { name: 'Do next week', order: 3000 },
              { name: 'Do later', order: 4000 }
            ]
          },
          members: {
            create: {
              userId: user.id,
              role: 'ADMIN'
            }
          }
        }
      });
    }

    // Generate Tokens
    const tokens = await generateTokens(user.id, rememberMe);

    res.json({
      message: 'Google login successful!',
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: { id: user.id, name: user.name, email: user.email, darkMode: user.darkMode, profilePhoto: user.profilePhoto }
    });

  } catch (error) {
    console.error('Google Auth Error:', error);
    res.status(500).json({ error: 'Google authentication failed.', details: error.message });
  }
});

// 1. KAYIT OL (REGISTER) - POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, rememberMe } = req.body;

    // Girdilerin kontrolü
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Lütfen tüm alanları doldurun.' });
    }

    // Email zaten var mı kontrolü
    const userExists = await prisma.user.findUnique({ where: { email } });
    if (userExists) {
      return res.status(400).json({ error: 'Bu email adresi zaten kullanımda.' });
    }

    // Şifreyi güvenli hale getirme
    const hashedPassword = await bcrypt.hash(password, 10);

    // Kullanıcıyı veritabanına kaydetme
    const newUser = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
      },
    });

    // Otomatik olarak Workspace ve Team oluşturma
    const workspace = await prisma.workspace.create({
      data: {
        name: `${newUser.name}'s Workspace`,
        members: {
          create: { userId: newUser.id, role: 'ADMIN' }
        },
        teams: {
          create: {
            name: 'Work',
            description: 'Default team',
            members: {
              create: { userId: newUser.id, role: 'ADMIN' }
            }
          }
        }
      },
      include: { teams: true }
    });

    const teamId = workspace.teams[0].id;

    // Otomatik olarak "My Tasks" projesi oluşturma
    await prisma.project.create({
      data: {
        name: 'My Tasks',
        status: 'MY_TASKS',
        ownerId: newUser.id,
        workspaceId: workspace.id,
        teamId: teamId,
        color: '#4F46E5',
        icon: '👤',
        sections: {
          create: [
            { name: 'Recently assigned', order: 1000 },
            { name: 'Do today', order: 2000 },
            { name: 'Do next week', order: 3000 },
            { name: 'Do later', order: 4000 }
          ]
        },
        members: {
          create: {
            userId: newUser.id,
            role: 'ADMIN'
          }
        }
      }
    });

    // Generate Tokens
    const tokens = await generateTokens(newUser.id, rememberMe);

    res.status(201).json({ 
      message: 'Kullanıcı başarıyla oluşturuldu.', 
      userId: newUser.id,
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: { id: newUser.id, name: newUser.name, email: newUser.email, darkMode: newUser.darkMode, profilePhoto: newUser.profilePhoto }
    });
  } catch (error) {
    res.status(500).json({ error: 'Kayıt esnasında bir hata oluştu.', details: error.message });
  }
});

// 2. GİRİŞ YAP (LOGIN) - POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password, rememberMe } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email ve şifre zorunludur.' });
    }

    // Kullanıcıyı bulma
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(400).json({ error: 'Geçersiz email veya şifre.' });
    }

    // Şifre eşleşiyor mu kontrolü
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ error: 'Geçersiz email veya şifre.' });
    }

    // Generate Tokens
    const tokens = await generateTokens(user.id, rememberMe);

    res.json({
      message: 'Giriş başarılı!',
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: { id: user.id, name: user.name, email: user.email, darkMode: user.darkMode, profilePhoto: user.profilePhoto }
    });
  } catch (error) {
    res.status(500).json({ error: 'Giriş esnasında bir hata oluştu.', details: error.message });
  }
});
// 3. REFRESH TOKEN - POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token is required.' });
    }

    // Find the session
    const session = await prisma.session.findUnique({
      where: { refreshToken }
    });

    if (!session) {
      return res.status(401).json({ error: 'Invalid refresh token.' });
    }

    // Check if expired
    if (new Date() > session.expiresAt) {
      // Clean up expired session
      await prisma.session.delete({ where: { id: session.id } });
      return res.status(401).json({ error: 'Refresh token expired.' });
    }

    // Generate new access token
    const newAccessToken = jwt.sign({ userId: session.userId }, JWT_SECRET, { expiresIn: '1h' });
    
    // Rotate refresh token for security
    const newRefreshToken = crypto.randomBytes(40).toString('hex');
    
    // Update session in DB
    await prisma.session.update({
      where: { id: session.id },
      data: { refreshToken: newRefreshToken }
    });

    res.json({
      token: newAccessToken,
      refreshToken: newRefreshToken
    });
  } catch (error) {
    res.status(500).json({ error: 'Token refresh failed.', details: error.message });
  }
});

// 4. LOGOUT - POST /api/auth/logout
router.post('/logout', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (refreshToken) {
      // Attempt to delete the session if it exists
      await prisma.session.deleteMany({
        where: { refreshToken }
      });
    }
    
    res.json({ message: 'Logged out successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Logout failed.', details: error.message });
  }
});

// 5. PREFERENCES - PATCH /api/auth/me/preferences
router.patch('/me/preferences', authenticateToken, async (req, res) => {
  try {
    const { darkMode } = req.body;
    const updatedUser = await prisma.user.update({
      where: { id: req.user.userId },
      data: { darkMode }
    });
    res.json({ message: 'Preferences updated', user: { id: updatedUser.id, name: updatedUser.name, email: updatedUser.email, darkMode: updatedUser.darkMode, profilePhoto: updatedUser.profilePhoto } });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update preferences', details: error.message });
  }
});

// 6. GENERATE PASSWORD RESET LINK (Admin Only) - POST /api/auth/generate-reset-link
router.post('/generate-reset-link', authenticateToken, async (req, res) => {
  try {
    const { targetUserId, workspaceId } = req.body;
    const adminId = req.user.userId;

    if (!targetUserId || !workspaceId) {
       return res.status(400).json({ error: 'targetUserId and workspaceId are required.' });
    }

    // Verify admin is actually admin of the workspace
    const adminMembership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: adminId } }
    });
    if (!adminMembership || adminMembership.role !== 'ADMIN') {
       return res.status(403).json({ error: 'Only workspace admins can generate reset links.' });
    }

    // Verify targetUser is in that workspace
    const targetMembership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: targetUserId } }
    });
    if (!targetMembership) {
       return res.status(404).json({ error: 'Target user is not in this workspace.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours expiry

    const resetToken = await prisma.passwordResetToken.create({
      data: {
        token,
        userId: targetUserId,
        expiresAt
      }
    });

    res.json({ token, expiresAt });
  } catch (error) {
    console.error('Error generating reset link:', error);
    res.status(500).json({ error: 'Failed to generate reset link.' });
  }
});

// 7. RESET PASSWORD - POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and newPassword are required.' });
    }

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token }
    });

    if (!resetToken || resetToken.isUsed) {
      return res.status(400).json({ error: 'Invalid or already used reset token.' });
    }

    if (new Date() > resetToken.expiresAt) {
      return res.status(400).json({ error: 'Reset token has expired.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user's password
    await prisma.user.update({
      where: { id: resetToken.userId },
      data: { password: hashedPassword }
    });

    // Mark token as used
    await prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { isUsed: true }
    });

    // Optionally: delete all active sessions to force re-login everywhere for security
    await prisma.session.deleteMany({
      where: { userId: resetToken.userId }
    });

    res.json({ message: 'Password has been successfully reset.' });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ error: 'Failed to reset password.' });
  }
});

// PROFILE PHOTO ROUTES

// Upload profile photo
router.post('/profile-photo', authenticateToken, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const userId = req.user.userId;
    const filename = req.file.filename;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { profilePhoto: filename }
    });

    res.json({ message: 'Profile photo updated', profilePhoto: filename });
  } catch (error) {
    console.error('Error uploading profile photo:', error);
    res.status(500).json({ error: 'Failed to upload profile photo' });
  }
});

// Serve profile photo
router.get('/users/:userId/photo', authenticateToken, async (req, res) => {
  try {
    const userId = req.params.userId;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { profilePhoto: true }
    });

    if (!user || !user.profilePhoto) {
      return res.status(404).json({ error: 'Profile photo not found' });
    }

    const filePath = path.join(__dirname, '..', '..', 'uploads', 'avatars', user.profilePhoto);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Profile photo file not found' });
    }

    res.sendFile(filePath);
  } catch (error) {
    console.error('Error serving profile photo:', error);
    res.status(500).json({ error: 'Failed to serve profile photo' });
  }
});

module.exports = router;