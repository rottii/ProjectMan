const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { authenticateToken } = require('../middleware/auth');

// Get messages for a specific workspace
router.get('/:workspaceId', authenticateToken, async (req, res, next) => {
  try {
    const { workspaceId } = req.params;

    // Verify user is a member of this workspace
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: req.user.userId
        }
      }
    });

    if (!membership) {
      return res.status(403).json({ error: 'You are not a member of this workspace.' });
    }

    const messages = await prisma.workspaceMessage.findMany({
      where: { workspaceId },
      include: {
        sender: {
          select: { id: true, name: true, profilePhoto: true }
        }
      },
      orderBy: { createdAt: 'asc' },
      take: 100 // Limit to last 100 for simplicity
    });

    res.json(messages);
  } catch (error) {
    next(error);
  }
});

// Send a new message to a workspace
router.post('/:workspaceId', authenticateToken, async (req, res, next) => {
  try {
    const { workspaceId } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Message content is required.' });
    }

    // Verify user is a member of this workspace
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: req.user.userId
        }
      }
    });

    if (!membership) {
      return res.status(403).json({ error: 'You are not a member of this workspace.' });
    }

    const message = await prisma.workspaceMessage.create({
      data: {
        content: content.trim(),
        workspaceId,
        senderId: req.user.userId
      },
      include: {
        sender: {
          select: { id: true, name: true, profilePhoto: true }
        }
      }
    });

    // Emit the message via Socket.IO
    if (req.app.get('io')) {
      req.app.get('io').to(`workspace_${workspaceId}`).emit('receive_workspace_message', message);
    }

    res.status(201).json(message);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
