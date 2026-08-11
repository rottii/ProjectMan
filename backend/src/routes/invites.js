const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { authenticateToken } = require('../middleware/auth');
const prisma = require('../lib/prisma');
const { JWT_SECRET } = require('../config/env');

const router = express.Router();

// Helper function to generate tokens (duplicating from auth.js for simplicity, or we could extract it to a util)
async function generateTokens(userId, rememberMe = false) {
  const accessToken = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '1h' });
  const refreshToken = crypto.randomBytes(40).toString('hex');
  const days = rememberMe ? 30 : 1;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + days);
  await prisma.session.create({ data: { userId, refreshToken, expiresAt } });
  return { accessToken, refreshToken };
}

// 1. Generate Invite Link (Admin Only)
router.post('/workspaces/:workspaceId', authenticateToken, async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { expiresAt, maxUses } = req.body;
    const userId = req.user.userId;

    // Check if user is an admin of the workspace
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId
        }
      }
    });

    if (!membership || membership.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Only workspace admins can generate invite links.' });
    }

    const token = crypto.randomBytes(32).toString('hex');

    const inviteLink = await prisma.inviteLink.create({
      data: {
        token,
        workspaceId,
        creatorId: userId,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        maxUses: maxUses || null
      }
    });

    res.json({ token, inviteLink });
  } catch (error) {
    console.error('Error generating invite link:', error);
    res.status(500).json({ error: 'Failed to generate invite link.' });
  }
});

// 2. Get Invite Info (Public)
router.get('/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const inviteLink = await prisma.inviteLink.findUnique({
      where: { token },
      include: { workspace: true, creator: { select: { name: true } } }
    });

    if (!inviteLink || !inviteLink.isActive) {
      return res.status(404).json({ error: 'Invite link is invalid or inactive.' });
    }

    if (inviteLink.expiresAt && new Date() > inviteLink.expiresAt) {
      return res.status(400).json({ error: 'Invite link has expired.' });
    }

    if (inviteLink.maxUses && inviteLink.uses >= inviteLink.maxUses) {
      return res.status(400).json({ error: 'Invite link usage limit reached.' });
    }

    res.json({
      workspaceId: inviteLink.workspace.id,
      workspaceName: inviteLink.workspace.name,
      invitedBy: inviteLink.creator.name
    });
  } catch (error) {
    console.error('Error fetching invite info:', error);
    res.status(500).json({ error: 'Failed to fetch invite information.' });
  }
});

// 3. Accept Invite (Public)
router.post('/:token/accept', async (req, res) => {
  try {
    const { token } = req.params;
    
    const inviteLink = await prisma.inviteLink.findUnique({
      where: { token },
      include: { workspace: { include: { teams: true } } }
    });

    if (!inviteLink || !inviteLink.isActive) {
      return res.status(404).json({ error: 'Invite link is invalid or inactive.' });
    }

    if (inviteLink.expiresAt && new Date() > inviteLink.expiresAt) {
      return res.status(400).json({ error: 'Invite link has expired.' });
    }

    if (inviteLink.maxUses && inviteLink.uses >= inviteLink.maxUses) {
      return res.status(400).json({ error: 'Invite link usage limit reached.' });
    }

    const workspaceId = inviteLink.workspaceId;
    let userIdToJoin = null;
    const { email, password, name, rememberMe } = req.body || {};

    // Check if user is already authenticated
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const authToken = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(authToken, JWT_SECRET);
        userIdToJoin = decoded.userId;
      } catch (err) {
        // Invalid token, ignore and proceed as unauthenticated if they provide form data
        console.warn("Invalid auth token provided to invite accept:", err.message);
      }
    }

    if (!userIdToJoin) {
      // Must be a new user registration
      if (!email || !password || !name) {
        return res.status(400).json({ error: 'Please provide all required fields.' });
      }

      // Create new user
      const userExists = await prisma.user.findUnique({ where: { email } });
      if (userExists) {
          return res.status(400).json({ error: 'Email already in use. Please login and then accept the invite from within the app.' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const newUser = await prisma.user.create({
        data: {
          email,
          name,
          password: hashedPassword,
        },
      });
      userIdToJoin = newUser.id;
    }

    // Check if user is already a member
    const existingMember = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId, userId: userIdToJoin }
      }
    });

    if (existingMember) {
      return res.status(200).json({ message: 'You are already a member of this workspace.', workspaceId });
    }

    // Add user to workspace
    await prisma.workspaceMember.create({
      data: {
        workspaceId,
        userId: userIdToJoin,
        role: 'MEMBER'
      }
    });

    // Add user to the default 'Work' team in the workspace if it exists
    const workTeam = inviteLink.workspace.teams.find(t => t.name === 'Work') || inviteLink.workspace.teams[0];
    if (workTeam) {
       // Check if already in team
       const existingTeamMember = await prisma.teamMember.findUnique({
           where: { teamId_userId: { teamId: workTeam.id, userId: userIdToJoin } }
       });

       if (!existingTeamMember) {
           await prisma.teamMember.create({
               data: {
                   teamId: workTeam.id,
                   userId: userIdToJoin,
                   role: 'MEMBER'
               }
           });
       }
       // If this was a new user, they might not have a "My Tasks" yet, but for safety, we check
       const existingMyTasks = await prisma.project.findFirst({
           where: { ownerId: userIdToJoin, status: 'MY_TASKS', workspaceId }
       });

       if (!existingMyTasks) {
          // Otomatik olarak "My Tasks" projesi oluşturma
          await prisma.project.create({
            data: {
              name: 'My Tasks',
              status: 'MY_TASKS',
              ownerId: userIdToJoin,
              workspaceId: workspaceId,
              teamId: workTeam.id,
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
                  userId: userIdToJoin,
                  role: 'ADMIN'
                }
              }
            }
          });
       }
    }

    // Increment invite link usage
    await prisma.inviteLink.update({
      where: { id: inviteLink.id },
      data: { uses: { increment: 1 } }
    });

    const isNewUser = req.body && req.body.email && req.body.password;

    if (isNewUser) {
        // Generate tokens and login for the new user
        const tokens = await generateTokens(userIdToJoin, req.body.rememberMe);
        const userRec = await prisma.user.findUnique({ where: { id: userIdToJoin } });

        res.status(201).json({
          message: 'Successfully joined the workspace!',
          workspaceId,
          token: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          user: { id: userRec.id, name: userRec.name, email: userRec.email, darkMode: userRec.darkMode, profilePhoto: userRec.profilePhoto }
        });
    } else {
        res.status(200).json({
            message: 'Successfully joined the workspace!',
            workspaceId
        });
    }

  } catch (error) {
    console.error('Error accepting invite:', error);
    res.status(500).json({ error: 'Failed to accept invite.' });
  }
});

module.exports = router;
