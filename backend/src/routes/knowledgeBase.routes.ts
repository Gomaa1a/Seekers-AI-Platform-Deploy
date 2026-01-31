import { Router } from 'express';
import multer from 'multer';
import { knowledgeBaseService } from '../services';
import { uploadService } from '../services/upload.service';
import { authenticate } from '../middleware';
import { validateSchema, schemas } from '../middleware/validation';
import { asyncHandler } from '../utils/helpers';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

const router = Router();

/**
 * @route   GET /api/knowledge-bases
 * @desc    Get all knowledge bases for the organization
 * @access  Private
 */
router.get(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const organizationId = req.user!.organizationId;
    const type = req.query.type as 'chatbot' | 'comments' | undefined;

    const knowledgeBases = type
      ? await knowledgeBaseService.getByType(organizationId, type)
      : await knowledgeBaseService.getAll(organizationId);

    res.json({
      success: true,
      data: knowledgeBases,
    });
  })
);

/**
 * @route   GET /api/knowledge-bases/:id
 * @desc    Get a specific knowledge base
 * @access  Private
 */
router.get(
  '/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const organizationId = req.user!.organizationId;

    const knowledgeBase = await knowledgeBaseService.getById(id, organizationId);

    if (!knowledgeBase) {
      res.status(404).json({
        success: false,
        message: 'Knowledge base not found',
      });
      return;
    }

    res.json({
      success: true,
      data: knowledgeBase,
    });
  })
);

/**
 * @route   POST /api/knowledge-bases
 * @desc    Create a new knowledge base
 * @access  Private
 */
router.post(
  '/',
  authenticate,
  validateSchema(schemas.createKnowledgeBase),
  asyncHandler(async (req, res) => {
    const organizationId = req.user!.organizationId;
    const userId = req.user!.userId;

    const knowledgeBase = await knowledgeBaseService.create(
      organizationId,
      userId,
      req.body
    );

    res.status(201).json({
      success: true,
      message: 'Knowledge base created successfully',
      data: knowledgeBase,
    });
  })
);

/**
 * @route   PUT /api/knowledge-bases/:id
 * @desc    Update a knowledge base
 * @access  Private
 */
router.put(
  '/:id',
  authenticate,
  validateSchema(schemas.updateKnowledgeBase),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const organizationId = req.user!.organizationId;
    const userId = req.user!.userId;

    const knowledgeBase = await knowledgeBaseService.update(
      id,
      organizationId,
      userId,
      req.body
    );

    res.json({
      success: true,
      message: 'Knowledge base updated successfully',
      data: knowledgeBase,
    });
  })
);

/**
 * @route   DELETE /api/knowledge-bases/:id
 * @desc    Delete a knowledge base
 * @access  Private
 */
router.delete(
  '/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const organizationId = req.user!.organizationId;

    await knowledgeBaseService.delete(id, organizationId);

    res.json({
      success: true,
      message: 'Knowledge base deleted successfully',
    });
  })
);

/**
 * @route   PUT /api/knowledge-bases/:id/toggle
 * @desc    Toggle knowledge base active status
 * @access  Private
 */
router.put(
  '/:id/toggle',
  authenticate,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { isActive } = req.body;
    const organizationId = req.user!.organizationId;

    if (typeof isActive !== 'boolean') {
      res.status(400).json({
        success: false,
        message: 'isActive must be a boolean',
      });
      return;
    }

    const knowledgeBase = await knowledgeBaseService.toggle(
      id,
      organizationId,
      isActive
    );

    res.json({
      success: true,
      message: `Knowledge base ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: knowledgeBase,
    });
  })
);

/**
 * @route   GET /api/knowledge-bases/:id/history
 * @desc    Get knowledge base version history
 * @access  Private
 */
router.get(
  '/:id/history',
  authenticate,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const organizationId = req.user!.organizationId;

    const history = await knowledgeBaseService.getHistory(id, organizationId);

    res.json({
      success: true,
      data: history,
    });
  })
);

/**
 * @route   POST /api/knowledge-bases/:id/restore/:versionId
 * @desc    Restore a specific version
 * @access  Private
 */
router.post(
  '/:id/restore/:versionId',
  authenticate,
  asyncHandler(async (req, res) => {
    const { id, versionId } = req.params;
    const organizationId = req.user!.organizationId;
    const userId = req.user!.userId;

    const knowledgeBase = await knowledgeBaseService.restoreVersion(id, organizationId, userId, parseInt(versionId));

    res.json({
      success: true,
      message: 'Version restored successfully',
      data: knowledgeBase,
    });
  })
);

// ============================================
// Attachments (GCP Cloud Storage)
// ============================================

/**
 * @route   GET /api/knowledge-bases/:id/attachments
 * @desc    List attachments for a knowledge base
 * @access  Private
 */
router.get(
  '/:id/attachments',
  authenticate,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const organizationId = req.user!.organizationId;

    const attachments = await uploadService.getAttachments(id, organizationId);

    res.json({
      success: true,
      data: attachments,
    });
  })
);

/**
 * @route   POST /api/knowledge-bases/:id/attachments
 * @desc    Upload a file attachment to a knowledge base
 * @access  Private
 */
router.post(
  '/:id/attachments',
  authenticate,
  upload.single('file'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const organizationId = req.user!.organizationId;
    const userId = req.user!.userId;

    if (!req.file) {
      res.status(400).json({ success: false, message: 'No file provided' });
      return;
    }

    // Verify KB belongs to org
    const kb = await knowledgeBaseService.getById(id, organizationId);
    if (!kb) {
      res.status(404).json({ success: false, message: 'Knowledge base not found' });
      return;
    }

    const attachment = await uploadService.uploadFile(req.file, organizationId, id, userId);

    res.status(201).json({
      success: true,
      message: 'File uploaded successfully',
      data: attachment,
    });
  })
);

/**
 * @route   GET /api/knowledge-bases/:id/attachments/:attachmentId/download
 * @desc    Get a signed download URL for an attachment
 * @access  Private
 */
router.get(
  '/:id/attachments/:attachmentId/download',
  authenticate,
  asyncHandler(async (req, res) => {
    const { attachmentId } = req.params;
    const organizationId = req.user!.organizationId;

    const url = await uploadService.getSignedUrl(attachmentId, organizationId);

    res.json({
      success: true,
      data: { url },
    });
  })
);

/**
 * @route   DELETE /api/knowledge-bases/:id/attachments/:attachmentId
 * @desc    Delete an attachment
 * @access  Private
 */
router.delete(
  '/:id/attachments/:attachmentId',
  authenticate,
  asyncHandler(async (req, res) => {
    const { attachmentId } = req.params;
    const organizationId = req.user!.organizationId;

    await uploadService.deleteFile(attachmentId, organizationId);

    res.json({
      success: true,
      message: 'Attachment deleted successfully',
    });
  })
);

export default router;
