import { Router } from 'express';
import { workflowRequestService } from '../services';
import { authenticate } from '../middleware';
import { validateSchema, schemas } from '../middleware/validation';
import { asyncHandler } from '../utils/helpers';

const router = Router();

/**
 * @route   GET /api/workflow-requests
 * @desc    Get all workflow requests for the organization
 * @access  Private
 */
router.get(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const organizationId = req.user!.organizationId;

    const requests = await workflowRequestService.getOrganizationWorkflowRequests(
      organizationId
    );

    res.json({
      success: true,
      data: requests,
    });
  })
);

/**
 * @route   GET /api/workflow-requests/:id
 * @desc    Get a specific workflow request
 * @access  Private
 */
router.get(
  '/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const organizationId = req.user!.organizationId;

    const request = await workflowRequestService.getWorkflowRequestById(id, organizationId);

    if (!request) {
      res.status(404).json({
        success: false,
        message: 'Workflow request not found',
      });
      return;
    }

    res.json({
      success: true,
      data: request,
    });
  })
);

/**
 * @route   POST /api/workflow-requests
 * @desc    Create a new workflow request
 * @access  Private
 */
router.post(
  '/',
  authenticate,
  validateSchema(schemas.createWorkflowRequest),
  asyncHandler(async (req, res) => {
    const organizationId = req.user!.organizationId;

    const request = await workflowRequestService.createWorkflowRequest(
      organizationId,
      req.body
    );

    res.status(201).json({
      success: true,
      message: 'Workflow request submitted successfully. Our team will review it shortly.',
      data: request,
    });
  })
);

// ============================================
// Add-on Requests
// ============================================

/**
 * @route   GET /api/workflow-requests/addons
 * @desc    Get all add-on requests for the organization
 * @access  Private
 */
router.get(
  '/addons/list',
  authenticate,
  asyncHandler(async (req, res) => {
    const organizationId = req.user!.organizationId;

    const requests = await workflowRequestService.getOrganizationAddonRequests(
      organizationId
    );

    res.json({
      success: true,
      data: requests,
    });
  })
);

/**
 * @route   GET /api/workflow-requests/addons/:id
 * @desc    Get a specific add-on request
 * @access  Private
 */
router.get(
  '/addons/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const organizationId = req.user!.organizationId;

    const request = await workflowRequestService.getAddonRequestById(id, organizationId);

    if (!request) {
      res.status(404).json({
        success: false,
        message: 'Add-on request not found',
      });
      return;
    }

    res.json({
      success: true,
      data: request,
    });
  })
);

/**
 * @route   POST /api/workflow-requests/addons
 * @desc    Create a new add-on request
 * @access  Private
 */
router.post(
  '/addons',
  authenticate,
  validateSchema(schemas.createAddonRequest),
  asyncHandler(async (req, res) => {
    const organizationId = req.user!.organizationId;

    const request = await workflowRequestService.createAddonRequest(
      organizationId,
      req.body
    );

    res.status(201).json({
      success: true,
      message: 'Add-on request submitted successfully. Our team will configure it shortly.',
      data: request,
    });
  })
);

/**
 * @route   GET /api/workflow-requests/available-addons
 * @desc    Get list of available add-ons
 * @access  Private
 */
router.get(
  '/addons/available',
  authenticate,
  asyncHandler(async (req, res) => {
    // Return list of available add-ons
    const availableAddons = [
      {
        type: 'google_sheets',
        name: 'Google Sheets Integration',
        description: 'Sync conversation data and leads to Google Sheets automatically',
        icon: 'sheets',
        configurationFields: [
          { name: 'spreadsheetUrl', label: 'Spreadsheet URL', type: 'url', required: true },
          { name: 'sheetName', label: 'Sheet Name', type: 'text', required: false },
        ],
      },
      {
        type: 'whatsapp_notification',
        name: 'WhatsApp Notifications',
        description: 'Receive important notifications via WhatsApp',
        icon: 'whatsapp',
        configurationFields: [
          { name: 'phoneNumber', label: 'Phone Number', type: 'phone', required: true },
          { name: 'notifyOn', label: 'Notify On', type: 'multiselect', required: true, options: [
            { value: 'new_conversation', label: 'New Conversations' },
            { value: 'escalation', label: 'Escalations' },
            { value: 'high_priority', label: 'High Priority Messages' },
          ]},
        ],
      },
      {
        type: 'email_notification',
        name: 'Email Notifications',
        description: 'Get email alerts for important events',
        icon: 'email',
        configurationFields: [
          { name: 'email', label: 'Email Address', type: 'email', required: true },
          { name: 'frequency', label: 'Frequency', type: 'select', required: true, options: [
            { value: 'instant', label: 'Instant' },
            { value: 'hourly', label: 'Hourly Digest' },
            { value: 'daily', label: 'Daily Digest' },
          ]},
        ],
      },
      {
        type: 'crm_sync',
        name: 'CRM Integration',
        description: 'Sync leads and conversations with your CRM',
        icon: 'crm',
        configurationFields: [
          { name: 'crmType', label: 'CRM Type', type: 'select', required: true, options: [
            { value: 'hubspot', label: 'HubSpot' },
            { value: 'salesforce', label: 'Salesforce' },
            { value: 'zoho', label: 'Zoho CRM' },
            { value: 'pipedrive', label: 'Pipedrive' },
          ]},
          { name: 'apiKey', label: 'API Key', type: 'password', required: true },
        ],
      },
      {
        type: 'custom_webhook',
        name: 'Custom Webhook',
        description: 'Send events to your custom webhook endpoint',
        icon: 'webhook',
        configurationFields: [
          { name: 'webhookUrl', label: 'Webhook URL', type: 'url', required: true },
          { name: 'secret', label: 'Webhook Secret', type: 'password', required: false },
          { name: 'events', label: 'Events', type: 'multiselect', required: true, options: [
            { value: 'message_received', label: 'Message Received' },
            { value: 'message_sent', label: 'Message Sent' },
            { value: 'conversation_started', label: 'Conversation Started' },
            { value: 'conversation_ended', label: 'Conversation Ended' },
          ]},
        ],
      },
    ];

    res.json({
      success: true,
      data: availableAddons,
    });
  })
);

export default router;
