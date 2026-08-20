const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const { authenticateToken } = require('../middleware/auth');
const { sendVerificationEmail } = require('../utils/emailService');

const router = express.Router();
const prisma = require('../lib/prisma');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const getUserPayload = (u) => ({
  id: u.id, 
  name: u.name, 
  email: u.email, 
  darkMode: u.darkMode, 
  profilePhoto: u.profilePhoto,
  jobTitle: u.jobTitle,
  department: u.department,
  aboutMe: u.aboutMe,
  emailVerified: u.emailVerified,
  emailNotifAssigned: u.emailNotifAssigned,
  emailNotifComment: u.emailNotifComment,
  emailNotifMention: u.emailNotifMention,
  emailNotifReminder: u.emailNotifReminder,
  emailNotifUpdates: u.emailNotifUpdates,
  sidebarColor: u.sidebarColor,
  language: u.language,
  firstDayOfWeek: u.firstDayOfWeek,
  notificationDuration: u.notificationDuration,
  openAppAs: u.openAppAs,
  showRowNumbers: u.showRowNumbers,
  compactMode: u.compactMode,
  colorBlindMode: u.colorBlindMode,
  showCelebrations: u.showCelebrations,
  appNotifAssigned: u.appNotifAssigned,
  appNotifComment: u.appNotifComment,
  appNotifMention: u.appNotifMention,
  appNotifReminder: u.appNotifReminder
});

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
      // User doesn't exist, create them (Google-verified)
      user = await prisma.user.create({
        data: {
          email,
          name,
          googleId,
          emailVerified: true,
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
      user: getUserPayload(user)
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

    // Send verification email
    try {
      const verifyToken = crypto.randomBytes(32).toString('hex');
      const verifyExpiry = new Date();
      verifyExpiry.setHours(verifyExpiry.getHours() + 24);
      await prisma.emailVerification.create({
        data: {
          token: verifyToken,
          userId: newUser.id,
          expiresAt: verifyExpiry
        }
      });
      await sendVerificationEmail(newUser.email, newUser.name, verifyToken);
    } catch (emailErr) {
      console.error('Failed to send verification email:', emailErr);
      // Don't block registration if email fails
    }

    res.status(201).json({ 
      message: 'Kullanıcı başarıyla oluşturuldu.', 
      userId: newUser.id,
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: getUserPayload(newUser)
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
      user: getUserPayload(user)
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
    const { 
      darkMode, 
      name, 
      jobTitle, 
      department, 
      aboutMe,
      sidebarColor,
      language,
      firstDayOfWeek,
      notificationDuration,
      openAppAs,
      showRowNumbers,
      compactMode,
      colorBlindMode,
      showCelebrations,
      emailNotifAssigned,
      emailNotifComment,
      emailNotifMention,
      emailNotifReminder,
      emailNotifUpdates,
      appNotifAssigned,
      appNotifComment,
      appNotifMention,
      appNotifReminder
    } = req.body;
    
    // Build update object only with provided fields
    const data = {};
    if (darkMode !== undefined) data.darkMode = darkMode;
    if (name !== undefined) data.name = name;
    if (jobTitle !== undefined) data.jobTitle = jobTitle;
    if (department !== undefined) data.department = department;
    if (aboutMe !== undefined) data.aboutMe = aboutMe;
    
    if (sidebarColor !== undefined) data.sidebarColor = sidebarColor;
    if (language !== undefined) data.language = language;
    if (firstDayOfWeek !== undefined) data.firstDayOfWeek = firstDayOfWeek;
    if (notificationDuration !== undefined) data.notificationDuration = notificationDuration;
    if (openAppAs !== undefined) data.openAppAs = openAppAs;
    if (showRowNumbers !== undefined) data.showRowNumbers = showRowNumbers;
    if (compactMode !== undefined) data.compactMode = compactMode;
    if (colorBlindMode !== undefined) data.colorBlindMode = colorBlindMode;
    if (showCelebrations !== undefined) data.showCelebrations = showCelebrations;

    // Email notification preferences
    if (emailNotifAssigned !== undefined) data.emailNotifAssigned = emailNotifAssigned;
    if (emailNotifComment !== undefined) data.emailNotifComment = emailNotifComment;
    if (emailNotifMention !== undefined) data.emailNotifMention = emailNotifMention;
    if (emailNotifReminder !== undefined) data.emailNotifReminder = emailNotifReminder;
    if (emailNotifUpdates !== undefined) data.emailNotifUpdates = emailNotifUpdates;

    // In-App notification preferences
    if (appNotifAssigned !== undefined) data.appNotifAssigned = appNotifAssigned;
    if (appNotifComment !== undefined) data.appNotifComment = appNotifComment;
    if (appNotifMention !== undefined) data.appNotifMention = appNotifMention;
    if (appNotifReminder !== undefined) data.appNotifReminder = appNotifReminder;

    const updatedUser = await prisma.user.update({
      where: { id: req.user.userId },
      data
    });
    res.json({ 
      message: 'Preferences updated', 
      user: getUserPayload(updatedUser)
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update preferences', details: error.message });
  }
});

// VERIFY EMAIL - POST /api/auth/verify-email
router.post('/verify-email', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ error: 'Verification token is required.' });
    }

    const verification = await prisma.emailVerification.findUnique({
      where: { token }
    });

    if (!verification) {
      return res.status(400).json({ error: 'Invalid verification token.' });
    }

    if (new Date() > verification.expiresAt) {
      await prisma.emailVerification.delete({ where: { id: verification.id } });
      return res.status(400).json({ error: 'Verification token has expired. Please request a new one.' });
    }

    // Mark user as verified
    await prisma.user.update({
      where: { id: verification.userId },
      data: { emailVerified: true }
    });

    // Clean up all verification tokens for this user
    await prisma.emailVerification.deleteMany({
      where: { userId: verification.userId }
    });

    res.json({ message: 'Email verified successfully!' });
  } catch (error) {
    console.error('Error verifying email:', error);
    res.status(500).json({ error: 'Failed to verify email.' });
  }
});

// RESEND VERIFICATION EMAIL - POST /api/auth/resend-verification
router.post('/resend-verification', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (user.emailVerified) {
      return res.status(400).json({ error: 'Email is already verified.' });
    }

    // Rate limit: check if a verification was sent in the last 2 minutes
    const recent = await prisma.emailVerification.findFirst({
      where: {
        userId,
        createdAt: { gte: new Date(Date.now() - 2 * 60 * 1000) }
      }
    });

    if (recent) {
      return res.status(429).json({ error: 'Please wait 2 minutes before requesting another verification email.' });
    }

    // Clean up old tokens
    await prisma.emailVerification.deleteMany({ where: { userId } });

    // Create new token
    const verifyToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    await prisma.emailVerification.create({
      data: {
        token: verifyToken,
        userId,
        expiresAt
      }
    });

    await sendVerificationEmail(user.email, user.name, verifyToken);

    res.json({ message: 'Verification email sent!' });
  } catch (error) {
    console.error('Error resending verification:', error);
    res.status(500).json({ error: 'Failed to resend verification email.' });
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