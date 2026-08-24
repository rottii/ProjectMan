const express = require('express');
const jwt = require('jsonwebtoken');

const router = express.Router();
const prisma = require('../lib/prisma');
const { JWT_SECRET } = require('../config/env');

const { authenticateToken } = require('../middleware/auth');

// GET /api/tags -> Get all tags
router.get('/', authenticateToken, async (req, res) => {
  try {
    const tags = await prisma.tag.findMany({
      orderBy: { name: 'asc' }
    });
    res.json(tags);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Etiketler alınamadı.' });
  }
});

// POST /api/tags -> Create a tag
router.post('/', authenticateToken, async (req, res) => {
  const { name, color } = req.body;
  if (!name) return res.status(400).json({ error: 'Etiket adı gereklidir.' });

  try {
    const existing = await prisma.tag.findUnique({ where: { name } });
    if (existing) {
      return res.status(400).json({ error: 'Bu etiket zaten var.', tag: existing });
    }

    const tag = await prisma.tag.create({
      data: { 
        name, 
        color: color || '#9CA3AF' 
      }
    });
    res.status(201).json(tag);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Etiket oluşturulamadı.' });
  }
});

// PUT /api/tags/:tagId -> Update a tag
router.put('/:tagId', authenticateToken, async (req, res) => {
  const { tagId } = req.params;
  const { name, color } = req.body;
  
  if (!name) return res.status(400).json({ error: 'Etiket adı gereklidir.' });

  try {
    const existing = await prisma.tag.findFirst({
      where: {
        name,
        id: { not: tagId }
      }
    });

    if (existing) {
      return res.status(400).json({ error: 'Bu isimde başka bir etiket var.' });
    }

    const updatedTag = await prisma.tag.update({
      where: { id: tagId },
      data: { name, color: color || '#9CA3AF' }
    });

    res.json(updatedTag);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Etiket güncellenemedi.' });
  }
});

module.exports = router;
