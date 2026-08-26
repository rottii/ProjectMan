const express = require('express');
const { authenticateToken } = require('../middleware/auth');
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


// 1. SYNC - POST /api/auth/sync
// Called right after Firebase login on frontend. Ensures DB user exists and returns the profile.
router.post('/sync', authenticateToken, async (req, res) => {
  try {
    // If the user already exists in DB (req.user is set), just return it
    if (req.user) {
      const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
      return res.json({ 
        message: 'Sync successful', 
        user: getUserPayload(user) 
      });
    }

    // Otherwise, create a new user based on Firebase token payload (req.firebaseUser)
    const { uid, email, name, picture } = req.firebaseUser;
    
    // Check again by email just in case (e.g. they created an account manually before)
    let existingUser = await prisma.user.findUnique({ where: { email } });

    if (existingUser) {
      existingUser = await prisma.user.update({
        where: { email },
        data: { firebaseUid: uid, profilePhoto: existingUser.profilePhoto || picture }
      });
      return res.json({ 
        message: 'Account linked successfully', 
        user: getUserPayload(existingUser) 
      });
    }

    // Creating new user
    const newUserName = name || email.split('@')[0];
    
    const newUser = await prisma.user.create({
      data: {
        email: email,
        name: newUserName,
        firebaseUid: uid,
        profilePhoto: picture || null,
        emailVerified: true // Assume Firebase handled email verification or it's a social login
      }
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

    res.status(201).json({ 
      message: 'Kullanıcı başarıyla oluşturuldu.', 
      user: getUserPayload(newUser)
    });
  } catch (error) {
    console.error('Auth Sync Error:', error);
    res.status(500).json({ error: 'Sync failed.', details: error.message });
  }
});


// 2. PREFERENCES - PATCH /api/auth/me/preferences
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

    // Try normal file
    const filePath = path.join(__dirname, '..', '..', 'uploads', 'avatars', user.profilePhoto);
    if (fs.existsSync(filePath)) {
      return res.sendFile(filePath);
    }
    
    // If they used a google/firebase URL, just redirect
    if (user.profilePhoto.startsWith('http')) {
      return res.redirect(user.profilePhoto);
    }
    
    return res.status(404).json({ error: 'Profile photo file not found' });
  } catch (error) {
    console.error('Error serving profile photo:', error);
    res.status(500).json({ error: 'Failed to serve profile photo' });
  }
});

module.exports = router;