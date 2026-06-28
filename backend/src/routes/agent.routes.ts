import { Router } from 'express';
import { agentService } from '../services/agent.service';
import { authenticate } from '../middleware';
import { asyncHandler } from '../utils/helpers';

const router = Router();

/**
 * @route   GET /api/agents/stats
 * @desc    Aggregate agent stats for the organization
 * @access  Private
 */
router.get(
  '/stats',
  authenticate,
  asyncHandler(async (req, res) => {
    const stats = await agentService.getStats(req.user!.organizationId);
    res.json({ success: true, data: stats });
  })
);

/**
 * @route   GET /api/agents
 * @desc    List all AI agents for the organization
 * @access  Private
 */
router.get(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const agents = await agentService.getAll(req.user!.organizationId);
    res.json({ success: true, data: agents });
  })
);

/**
 * @route   GET /api/agents/:id
 * @desc    Get a single AI agent
 * @access  Private
 */
router.get(
  '/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const agent = await agentService.getById(req.params.id, req.user!.organizationId);
    if (!agent) {
      res.status(404).json({ success: false, message: 'Agent not found' });
      return;
    }
    res.json({ success: true, data: agent });
  })
);

/**
 * @route   POST /api/agents
 * @desc    Create a new AI agent (draft)
 * @access  Private
 */
router.post(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const agent = await agentService.create(
      req.user!.organizationId,
      req.user!.userId,
      req.body
    );
    res.status(201).json({
      success: true,
      message: 'Agent created successfully',
      data: agent,
    });
  })
);

/**
 * @route   PUT /api/agents/:id
 * @desc    Update an AI agent
 * @access  Private
 */
router.put(
  '/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const agent = await agentService.update(
      req.params.id,
      req.user!.organizationId,
      req.body
    );
    res.json({ success: true, message: 'Agent updated successfully', data: agent });
  })
);

/**
 * @route   POST /api/agents/:id/test
 * @desc    Chat with the agent in the in-app playground (before connecting a channel)
 * @access  Private
 */
router.post(
  '/:id/test',
  authenticate,
  asyncHandler(async (req, res) => {
    const { message, history } = req.body || {};
    const result = await agentService.generateTestReply(
      req.params.id,
      req.user!.organizationId,
      message,
      Array.isArray(history) ? history : []
    );
    res.json({ success: true, data: result });
  })
);

/**
 * @route   POST /api/agents/:id/connect
 * @desc    Mark the agent's channel as connected (self-serve channel link)
 * @access  Private
 */
router.post(
  '/:id/connect',
  authenticate,
  asyncHandler(async (req, res) => {
    const { channel, channels } = req.body || {};
    const agent = await agentService.update(req.params.id, req.user!.organizationId, {
      channel,
      channels: Array.isArray(channels) ? channels : undefined,
      channelConnected: true,
    });
    res.json({ success: true, message: 'Channel connected', data: agent });
  })
);

/**
 * @route   POST /api/agents/:id/persona
 * @desc    Generate (and save) an AI-written persona/system prompt for the agent
 * @access  Private
 */
router.post(
  '/:id/persona',
  authenticate,
  asyncHandler(async (req, res) => {
    const agent = await agentService.generatePersona(
      req.params.id,
      req.user!.organizationId
    );
    res.json({ success: true, message: 'Persona generated', data: agent });
  })
);

/**
 * @route   POST /api/agents/:id/activate
 * @desc    Take an agent live
 * @access  Private
 */
router.post(
  '/:id/activate',
  authenticate,
  asyncHandler(async (req, res) => {
    const agent = await agentService.setStatus(
      req.params.id,
      req.user!.organizationId,
      'active'
    );
    res.json({ success: true, message: 'Agent is live', data: agent });
  })
);

/**
 * @route   POST /api/agents/:id/pause
 * @desc    Pause a live agent
 * @access  Private
 */
router.post(
  '/:id/pause',
  authenticate,
  asyncHandler(async (req, res) => {
    const agent = await agentService.setStatus(
      req.params.id,
      req.user!.organizationId,
      'paused'
    );
    res.json({ success: true, message: 'Agent paused', data: agent });
  })
);

/**
 * @route   DELETE /api/agents/:id
 * @desc    Delete an AI agent
 * @access  Private
 */
router.delete(
  '/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    await agentService.delete(req.params.id, req.user!.organizationId);
    res.json({ success: true, message: 'Agent deleted successfully' });
  })
);

export default router;
