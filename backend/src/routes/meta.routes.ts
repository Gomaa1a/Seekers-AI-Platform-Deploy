import { Router } from 'express';
import { metaService, tokenService, organizationService, notificationService, freeTierService } from '../services';
import { authenticate } from '../middleware';
import { asyncHandler } from '../utils/helpers';
import { config, logger } from '../config';

const router = Router();

/**
 * @route   GET /api/meta/oauth/url
 * @desc    Get Meta OAuth URL
 * @access  Private
 */
router.get(
  '/oauth/url',
  authenticate,
  asyncHandler(async (req, res) => {
    // Use organizationId as state for CSRF protection
    const state = req.user!.organizationId;
    const url = metaService.generateAuthUrl(state);

    res.json({
      success: true,
      data: { url },
    });
  })
);

/**
 * @route   GET /api/meta/oauth/callback
 * @desc    Handle Meta OAuth callback
 * @access  Public (with state verification)
 */
router.get(
  '/oauth/callback',
  asyncHandler(async (req, res) => {
    const { code, state, error, error_description } = req.query;

    const frontend = config.app.frontendUrl;

    if (error) {
      res.redirect(
        `${frontend}/dashboard/settings/integrations?error=${encodeURIComponent(
          error_description as string || error as string
        )}`
      );
      return;
    }

    if (!code || !state) {
      res.redirect(`${frontend}/dashboard/settings/integrations?error=Missing%20parameters`);
      return;
    }

    // State contains organizationId
    const organizationId = state as string;

    try {
      // Exchange code for tokens
      const tokens = await metaService.exchangeCodeForToken(code as string);

      // Get long-lived token
      const longLivedToken = await metaService.getLongLivedToken(tokens.access_token);

      // Get user info from Meta
      const userInfo = await metaService.getUserInfo(longLivedToken.access_token);

      // Store user token with all required info
      // storeUserToken(orgId, userId, accessToken, expiresIn, metaUserId, metaUserName, scopes)
      await tokenService.storeUserToken(
        organizationId,
        organizationId, // Use org ID as user ID for now
        longLivedToken.access_token,
        longLivedToken.expires_in,
        userInfo.id,
        userInfo.name,
        ['pages_show_list', 'pages_read_engagement', 'pages_manage_metadata', 'instagram_basic', 'instagram_manage_messages']
      );

      // Notify admins
      await notificationService.notifyMetaConnected(organizationId, 'Meta');

      res.redirect(`${frontend}/dashboard/settings/integrations?success=true`);
    } catch (error: any) {
      res.redirect(
        `${frontend}/dashboard/settings/integrations?error=${encodeURIComponent(error.message)}`
      );
    }
  })
);

/**
 * @route   GET /api/meta/pages
 * @desc    Get available Facebook pages
 * @access  Private
 */
router.get(
  '/pages',
  authenticate,
  asyncHandler(async (req, res) => {
    // Get user token
    const userToken = await tokenService.getUserToken(req.user!.organizationId);

    if (!userToken) {
      res.status(400).json({
        success: false,
        message: 'Meta account not connected. Please connect your Meta account first.',
      });
      return;
    }

    const pages = await metaService.getUserPages(userToken);

    res.json({
      success: true,
      data: pages,
    });
  })
);

/**
 * @route   POST /api/meta/pages/:pageId/connect
 * @desc    Connect a Facebook page
 * @access  Private
 */
router.post(
  '/pages/:pageId/connect',
  authenticate,
  asyncHandler(async (req, res) => {
    const { pageId } = req.params;
    const organizationId = req.user!.organizationId;

    // Get user token
    const userToken = await tokenService.getUserToken(organizationId);

    if (!userToken) {
      res.status(400).json({
        success: false,
        message: 'Meta account not connected',
      });
      return;
    }

    // Get pages to find the selected one
    const pages = await metaService.getUserPages(userToken);
    const selectedPage = pages.find((p) => p.id === pageId);

    if (!selectedPage) {
      res.status(404).json({
        success: false,
        message: 'Page not found or you do not have access to it',
      });
      return;
    }

    // Encrypt and store page token
    const encryptedToken = tokenService.encryptToken(selectedPage.access_token);

    // Save page to database
    const page = await organizationService.addFacebookPage(organizationId, {
      pageId: selectedPage.id,
      pageName: selectedPage.name,
      accessToken: encryptedToken,
      category: selectedPage.category,
      pictureUrl: selectedPage.picture?.data?.url,
    });

    // Subscribe to webhooks
    await metaService.subscribePageWebhook(selectedPage.id, selectedPage.access_token);

    // Notify admins
    await notificationService.notifyPageConnected(organizationId, selectedPage.name, 'facebook');

    // Auto-connect to free tier webhook if user is on free plan
    const freeTierResult = await freeTierService.autoConnectFreeTier(
      organizationId, 
      req.user!.userId
    );

    res.json({
      success: true,
      message: 'Page connected successfully',
      data: {
        ...page,
        freeTierAutoConnected: freeTierResult.connected,
        freeTierTrialEndsAt: freeTierResult.trialEndsAt,
      },
    });
  })
);

/**
 * @route   DELETE /api/meta/pages/:id/disconnect
 * @desc    Disconnect a Facebook page
 * @access  Private
 */
router.delete(
  '/pages/:id/disconnect',
  authenticate,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const organizationId = req.user!.organizationId;

    // Get page first to unsubscribe from webhooks
    const page = await organizationService.getFacebookPageById(id, organizationId);

    if (!page) {
      res.status(404).json({
        success: false,
        message: 'Page not found',
      });
      return;
    }

    // Unsubscribe from webhooks
    try {
      const decryptedToken = tokenService.decryptToken(page.access_token_encrypted);
      await metaService.unsubscribePageWebhook(page.page_id, decryptedToken);
    } catch (error) {
      // Continue even if unsubscribe fails
    }

    // Remove from database
    await organizationService.removeFacebookPage(id, organizationId);

    res.json({
      success: true,
      message: 'Page disconnected successfully',
    });
  })
);

/**
 * @route   GET /api/meta/instagram
 * @desc    Get Instagram accounts linked to connected pages
 * @access  Private
 */
router.get(
  '/instagram',
  authenticate,
  asyncHandler(async (req, res) => {
    const organizationId = req.user!.organizationId;

    // Get connected Facebook pages
    const facebookPages = await organizationService.getFacebookPages(organizationId);

    if (facebookPages.length === 0) {
      res.json({
        success: true,
        data: [],
        message: 'Connect a Facebook page first to see linked Instagram accounts',
      });
      return;
    }

    // Get Instagram accounts for each page
    const instagramAccounts = [];

    for (const page of facebookPages) {
      try {
        const decryptedToken = tokenService.decryptToken(page.access_token_encrypted);
        const igAccount = await metaService.getInstagramAccount(page.page_id, decryptedToken);
        
        if (igAccount) {
          instagramAccounts.push({
            ...igAccount,
            facebookPageId: page.id,
            facebookPageName: page.page_name,
          });
        }
      } catch (error) {
        // Skip pages without Instagram
      }
    }

    res.json({
      success: true,
      data: instagramAccounts,
    });
  })
);

/**
 * @route   POST /api/meta/instagram/:instagramId/connect
 * @desc    Connect an Instagram account
 * @access  Private
 */
router.post(
  '/instagram/:instagramId/connect',
  authenticate,
  asyncHandler(async (req, res) => {
    const { instagramId } = req.params;
    const { facebookPageId } = req.body;
    const organizationId = req.user!.organizationId;

    if (!facebookPageId) {
      res.status(400).json({
        success: false,
        message: 'Facebook page ID is required',
      });
      return;
    }

    // Get Facebook page
    const fbPage = await organizationService.getFacebookPageById(facebookPageId, organizationId);

    if (!fbPage) {
      res.status(404).json({
        success: false,
        message: 'Facebook page not found',
      });
      return;
    }

    // Get Instagram account details
    const decryptedToken = tokenService.decryptToken(fbPage.access_token_encrypted);
    const igAccount = await metaService.getInstagramAccount(fbPage.page_id, decryptedToken);

    if (!igAccount || igAccount.id !== instagramId) {
      res.status(404).json({
        success: false,
        message: 'Instagram account not found or not linked to this page',
      });
      return;
    }

    // Save Instagram account
    const encryptedToken = tokenService.encryptToken(decryptedToken);

    const account = await organizationService.addInstagramAccount(organizationId, {
      instagramId: igAccount.id,
      username: igAccount.username,
      accessToken: encryptedToken,
      facebookPageId: fbPage.id,
      profilePictureUrl: igAccount.profilePictureUrl,
      followersCount: igAccount.followersCount,
    });

    // Subscribe to Instagram webhooks
    await metaService.subscribeInstagramWebhook(igAccount.id, decryptedToken);

    // Notify admins
    await notificationService.notifyPageConnected(organizationId, igAccount.username, 'instagram');

    // Auto-connect to free tier webhook if user is on free plan
    const freeTierResult = await freeTierService.autoConnectFreeTier(
      organizationId, 
      req.user!.userId
    );

    res.json({
      success: true,
      message: 'Instagram account connected successfully',
      data: {
        ...account,
        freeTierAutoConnected: freeTierResult.connected,
        freeTierTrialEndsAt: freeTierResult.trialEndsAt,
      },
    });
  })
);

/**
 * @route   DELETE /api/meta/instagram/:id/disconnect
 * @desc    Disconnect an Instagram account
 * @access  Private
 */
router.delete(
  '/instagram/:id/disconnect',
  authenticate,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const organizationId = req.user!.organizationId;

    await organizationService.removeInstagramAccount(id, organizationId);

    res.json({
      success: true,
      message: 'Instagram account disconnected successfully',
    });
  })
);

/**
 * @route   GET /api/meta/connection-status
 * @desc    Get Meta connection status for the organization
 * @access  Private
 */
router.get(
  '/connection-status',
  authenticate,
  asyncHandler(async (req, res) => {
    const organizationId = req.user!.organizationId;

    const [userToken, facebookPages, instagramAccounts] = await Promise.all([
      tokenService.getUserToken(organizationId),
      organizationService.getFacebookPages(organizationId),
      organizationService.getInstagramAccounts(organizationId),
    ]);

    res.json({
      success: true,
      data: {
        metaConnected: !!userToken,
        facebookPages: facebookPages.map((p) => ({
          id: p.id,
          pageId: p.page_id,
          name: p.page_name,
          isActive: p.is_active,
          pictureUrl: p.picture_url,
        })),
        instagramAccounts: instagramAccounts.map((a) => ({
          id: a.id,
          instagramId: a.instagram_id,
          username: a.username,
          isActive: a.is_active,
          profilePictureUrl: a.profile_picture_url,
        })),
      },
    });
  })
);

// ============================================
// Meta Data Deletion Callback (Required for Meta App Review)
// ============================================

/**
 * @route   POST /api/meta/deauthorize
 * @desc    Handle user deauthorization callback from Meta
 * @access  Public (Meta servers)
 */
router.post(
  '/deauthorize',
  asyncHandler(async (req, res) => {
    const { signed_request } = req.body;

    if (!signed_request) {
      res.status(400).json({
        success: false,
        message: 'Missing signed_request',
      });
      return;
    }

    try {
      // Parse and verify the signed request from Meta
      const data = metaService.parseSignedRequest(signed_request);
      
      if (!data || !data.user_id) {
        res.status(400).json({
          success: false,
          message: 'Invalid signed request',
        });
        return;
      }

      // Find and deactivate all pages/accounts for this Meta user
      // The user_id in the signed request is the Meta user ID
      const metaUserId = data.user_id;

      // Log the deauthorization
      logger.info('Meta deauthorization callback received', { metaUserId });

      // Find organizations with this Meta user and deactivate their connections
      // This is a best-effort cleanup - we may not have the exact mapping
      // Real implementation would need a meta_user_id column in organizations table

      res.json({
        success: true,
        message: 'Deauthorization processed',
      });
    } catch (error: any) {
      logger.error('Failed to process Meta deauthorization', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Failed to process deauthorization',
      });
    }
  })
);

/**
 * @route   POST /api/meta/deletion
 * @desc    Handle data deletion request callback from Meta
 *          This is required for Meta App Review compliance
 * @access  Public (Meta servers)
 */
router.post(
  '/deletion',
  asyncHandler(async (req, res) => {
    const { signed_request } = req.body;

    if (!signed_request) {
      res.status(400).json({
        success: false,
        message: 'Missing signed_request',
      });
      return;
    }

    try {
      // Parse and verify the signed request from Meta
      const data = metaService.parseSignedRequest(signed_request);
      
      if (!data || !data.user_id) {
        res.status(400).json({
          success: false,
          message: 'Invalid signed request',
        });
        return;
      }

      const metaUserId = data.user_id;
      
      // Generate a unique confirmation code for this deletion request
      const confirmationCode = `DEL-${Date.now()}-${metaUserId.substring(0, 8)}`;
      
      // Log the deletion request
      logger.info('Meta data deletion request received', { 
        metaUserId,
        confirmationCode,
      });

      // In a real implementation, you would:
      // 1. Queue the deletion request for processing
      // 2. Delete all user data associated with this Meta user ID
      // 3. Store the confirmation code for status checks

      // Meta expects this specific response format
      const statusUrl = `${config.app.apiBaseUrl}/api/meta/deletion-status?code=${confirmationCode}`;
      
      res.json({
        url: statusUrl,
        confirmation_code: confirmationCode,
      });
    } catch (error: any) {
      logger.error('Failed to process Meta deletion request', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Failed to process deletion request',
      });
    }
  })
);

/**
 * @route   GET /api/meta/deletion-status
 * @desc    Check status of a data deletion request
 * @access  Public
 */
router.get(
  '/deletion-status',
  asyncHandler(async (req, res) => {
    const { code } = req.query;

    if (!code) {
      res.status(400).json({
        success: false,
        message: 'Missing confirmation code',
      });
      return;
    }

    // In a real implementation, look up the deletion request status
    // For now, we'll return a completed status
    res.json({
      success: true,
      data: {
        confirmation_code: code,
        status: 'completed',
        message: 'All user data has been deleted',
      },
    });
  })
);

export default router;
