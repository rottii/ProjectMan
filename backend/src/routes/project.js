const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const { authenticateToken } = require('../middleware/auth');
const { requireProjectRole, requireTaskRole, requireSectionRole, requireWorkspaceMember } = require('../middleware/authorize');

// Setup multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '..', '..', 'uploads'));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + crypto.randomBytes(6).toString('hex');
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ 
    storage,
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

// Import Controllers
const projectController = require('../controllers/projectController');
const sectionController = require('../controllers/sectionController');
const taskController = require('../controllers/taskController');
const commentController = require('../controllers/commentController');
const dependencyController = require('../controllers/dependencyController');
const tagController = require('../controllers/tagController');
const attachmentController = require('../controllers/attachmentController');

// Apply authentication to all routes except public forms
router.use((req, res, next) => {
    // Exclude GET /:id/form and POST /:id/form/submit from authentication
    if (req.path.endsWith('/form') || req.path.endsWith('/form/submit')) {
        return next();
    }
    return authenticateToken(req, res, next);
});

// ==========================================
// PROJECT ROUTES
// ==========================================
router.get('/templates', requireWorkspaceMember('MEMBER'), projectController.getTemplates);
router.get('/', projectController.getProjects);
router.post('/', projectController.createProject);
router.post('/:id/duplicate', requireProjectRole('VIEWER'), projectController.duplicateProject);
router.post('/:id/save-as-template', requireProjectRole('ADMIN'), projectController.saveAsTemplate);
router.patch('/:id', requireProjectRole('EDITOR'), projectController.updateProject);
router.post('/:id/star', requireProjectRole('VIEWER'), projectController.toggleStar);
router.delete('/:id', requireProjectRole('ADMIN'), projectController.deleteProject);
router.get('/:id', requireProjectRole('VIEWER'), projectController.getProjectById);

router.post('/:id/share', requireProjectRole('ADMIN'), projectController.shareProject);
router.patch('/:id/members', requireProjectRole('ADMIN'), projectController.updateMemberRole);
router.delete('/:id/members/:userId', requireProjectRole('ADMIN'), projectController.removeMember);

router.post('/:id/public-link', requireProjectRole('ADMIN'), projectController.generatePublicLink);
router.delete('/:id/public-link', requireProjectRole('ADMIN'), projectController.revokePublicLink);

router.get('/:id/form', projectController.getFormSettings);
router.post('/:id/form/submit', projectController.submitForm);

// ==========================================
// SECTION ROUTES
// ==========================================
router.post('/sections', requireProjectRole('EDITOR'), sectionController.createSection);
router.patch('/sections/move', requireProjectRole('EDITOR'), sectionController.moveSection);
router.patch('/sections/:sectionId', requireSectionRole('EDITOR'), sectionController.renameSection);
router.delete('/sections/:sectionId', requireSectionRole('EDITOR'), sectionController.deleteSection);

// ==========================================
// TASK ROUTES
// ==========================================
router.patch('/tasks/bulk-update', taskController.bulkUpdate);
router.delete('/tasks/bulk-delete', taskController.bulkDelete);

router.post('/tasks', requireSectionRole('EDITOR'), taskController.createTask);
router.patch('/tasks/move', requireProjectRole('EDITOR'), taskController.moveTask);
router.post('/tasks/:taskId/convert-to-project', requireTaskRole('EDITOR'), taskController.convertToProject);
router.post('/tasks/:taskId/duplicate', requireTaskRole('EDITOR'), taskController.duplicateTask);
router.patch('/tasks/:taskId', requireTaskRole('EDITOR'), taskController.updateTask);
router.delete('/tasks/:taskId', requireTaskRole('EDITOR'), taskController.deleteTask);

router.post('/tasks/:taskId/projects', requireTaskRole('EDITOR'), taskController.addMultiHome);
router.delete('/tasks/:taskId/projects/:projectId', requireTaskRole('EDITOR'), taskController.removeMultiHome);

// ==========================================
// COMMENT & REACTION ROUTES
// ==========================================
router.post('/tasks/:taskId/comments', requireTaskRole('COMMENTER'), commentController.createComment);
router.delete('/tasks/:taskId/comments/:commentId', requireTaskRole('COMMENTER'), commentController.deleteComment);
router.post('/tasks/:taskId/comments/:commentId/reactions', requireTaskRole('COMMENTER'), commentController.toggleReaction);

// ==========================================
// DEPENDENCY ROUTES
// ==========================================
router.post('/tasks/:taskId/dependencies', requireTaskRole('EDITOR'), dependencyController.addDependency);
router.delete('/tasks/:taskId/dependencies/:dependencyId', requireTaskRole('EDITOR'), dependencyController.removeDependency);

// ==========================================
// TAG ROUTES
// ==========================================
router.post('/:projectId/tasks/:taskId/tags', requireProjectRole('EDITOR'), tagController.addTag);
router.delete('/:projectId/tasks/:taskId/tags/:tagId', requireProjectRole('EDITOR'), tagController.removeTag);

// ==========================================
// ATTACHMENT ROUTES
// ==========================================
router.post('/tasks/:taskId/attachments', requireTaskRole('COMMENTER'), upload.array('files', 10), attachmentController.uploadAttachment);
router.get('/tasks/:taskId/attachments', requireTaskRole('VIEWER'), attachmentController.getAttachments);
router.delete('/attachments/:attachmentId', attachmentController.deleteAttachment);
router.get('/attachments/:attachmentId/download', authenticateToken, attachmentController.downloadAttachment);

module.exports = router;
