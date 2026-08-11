const express = require('express');
const prisma = require('../lib/prisma');
const jwt = require('jsonwebtoken');

const router = express.Router();
const { JWT_SECRET } = require('../config/env');

// 1. ARA KATMAN: Giriş Kontrolü
const { authenticateToken } = require('../middleware/auth');

// GET /api/reporting/global
// Get high-level metrics for all tasks across user's projects
router.get('/global', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Shared filter: only tasks in projects the user owns or is a member of
    const accessFilter = {
      section: {
        project: {
          OR: [
            { ownerId: userId },
            { members: { some: { userId } } }
          ]
        }
      }
    };

    // Run all aggregations in parallel — each pushes work to PostgreSQL
    const [
      totalTasks,
      completedTasks,
      overdueTasks,
      tasksByProjectRaw,
      tasksByAssigneeRaw
    ] = await Promise.all([
      // 1. Total tasks
      prisma.task.count({ where: accessFilter }),

      // 2. Completed tasks
      prisma.task.count({ where: { ...accessFilter, isCompleted: true } }),

      // 3. Overdue incomplete tasks
      prisma.task.count({
        where: {
          ...accessFilter,
          isCompleted: false,
          dueDate: { lt: new Date() }
        }
      }),

      // 4. Tasks grouped by project (top 10)
      prisma.$queryRaw`
        SELECT
          p."name"                                             AS "projectName",
          COUNT(*)::int                                        AS "total",
          COUNT(*) FILTER (WHERE t."isCompleted" = true)::int  AS "completed"
        FROM "Task" t
        JOIN "Section" s ON s."id" = t."sectionId"
        JOIN "Project" p ON p."id" = s."projectId"
        WHERE (
          p."ownerId" = ${userId}
          OR EXISTS (
            SELECT 1 FROM "ProjectMembership" pm
            WHERE pm."projectId" = p."id" AND pm."userId" = ${userId}
          )
        )
        GROUP BY p."name"
        ORDER BY "total" DESC
        LIMIT 10
      `,

      // 5. Tasks grouped by assignee (top 10)
      prisma.$queryRaw`
        SELECT
          COALESCE(u."name", 'Unassigned')                     AS "assigneeName",
          COUNT(*)::int                                        AS "total",
          COUNT(*) FILTER (WHERE t."isCompleted" = true)::int  AS "completed"
        FROM "Task" t
        JOIN "Section" s ON s."id" = t."sectionId"
        JOIN "Project" p ON p."id" = s."projectId"
        LEFT JOIN "User" u ON u."id" = t."assigneeId"
        WHERE (
          p."ownerId" = ${userId}
          OR EXISTS (
            SELECT 1 FROM "ProjectMembership" pm
            WHERE pm."projectId" = p."id" AND pm."userId" = ${userId}
          )
        )
        GROUP BY u."name"
        ORDER BY "total" DESC
        LIMIT 10
      `
    ]);

    const incompleteTasks = totalTasks - completedTasks;

    const projectStats = tasksByProjectRaw.map(r => ({
      name: r.projectName,
      total: r.total,
      completed: r.completed,
      incomplete: r.total - r.completed
    }));

    const assigneeStats = tasksByAssigneeRaw.map(r => ({
      name: r.assigneeName,
      total: r.total,
      completed: r.completed
    }));

    res.json({
      totalTasks,
      completedTasks,
      incompleteTasks,
      overdueTasks,
      projectStats,
      assigneeStats
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Sunucu hatası oluştu.' });
  }
});

module.exports = router;
