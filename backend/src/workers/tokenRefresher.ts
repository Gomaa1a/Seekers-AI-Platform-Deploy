import { db, logger } from '../config';
import { tokenService } from '../services/token.service';
import { metaService } from '../services/meta.service';
import { notificationService } from '../services/notification.service';

const REFRESH_INTERVAL_MS = 6 * 60 * 60 * 1000; // Run every 6 hours

/**
 * Refreshes Meta long-lived tokens that are within 7 days of expiry.
 * Meta long-lived tokens last 60 days; this worker refreshes them early
 * to avoid service interruptions.
 */
async function refreshExpiringTokens(): Promise<void> {
  logger.info('Token refresh worker: starting run');

  try {
    const expiring = await tokenService.getTokensNeedingRefresh();

    if (expiring.length === 0) {
      logger.info('Token refresh worker: no tokens need refreshing');
      return;
    }

    logger.info(`Token refresh worker: found ${expiring.length} token(s) to refresh`);

    for (const token of expiring) {
      try {
        // Get the current (still valid) user token
        const currentToken = await tokenService.getUserToken(token.organizationId);
        if (!currentToken) {
          logger.warn('Token refresh worker: could not decrypt current token', {
            organizationId: token.organizationId,
          });
          await notifyRefreshFailure(token.organizationId, 'Token could not be decrypted');
          continue;
        }

        // Exchange for a new long-lived token
        const newToken = await metaService.getLongLivedToken(currentToken);

        // Get user info to preserve metadata
        const userInfo = await metaService.getUserInfo(newToken.access_token);

        // Store the refreshed token
        await tokenService.storeUserToken(
          token.organizationId,
          '', // userId from meta_tokens row — we keep the existing one
          newToken.access_token,
          newToken.expires_in,
          userInfo.id,
          userInfo.name,
          [] // scopes are preserved from original grant
        );

        // Also refresh page tokens — page tokens derived from a long-lived user token are non-expiring,
        // but re-fetching them ensures they stay valid after user token refresh
        await refreshPageTokens(token.organizationId, newToken.access_token);

        logger.info('Token refresh worker: token refreshed successfully', {
          organizationId: token.organizationId,
          newExpiresIn: newToken.expires_in,
        });
      } catch (error: any) {
        logger.error('Token refresh worker: failed to refresh token', {
          organizationId: token.organizationId,
          error: error.message,
        });

        await notifyRefreshFailure(token.organizationId, error.message);
      }
    }
  } catch (error: any) {
    logger.error('Token refresh worker: unexpected error', { error: error.message });
  }
}

/**
 * Re-fetch page access tokens using the refreshed user token
 */
async function refreshPageTokens(organizationId: string, userToken: string): Promise<void> {
  try {
    const pages = await metaService.getUserPages(userToken);

    for (const page of pages) {
      await tokenService.storePageToken(
        organizationId,
        page.id,
        page.name,
        page.access_token,
        {
          category: page.category,
          link: page.link,
          pictureUrl: page.picture?.data?.url,
          followersCount: undefined,
        }
      );
    }

    logger.info('Token refresh worker: page tokens refreshed', {
      organizationId,
      pageCount: pages.length,
    });
  } catch (error: any) {
    logger.error('Token refresh worker: failed to refresh page tokens', {
      organizationId,
      error: error.message,
    });
  }
}

/**
 * Notify admins and the org owner that token refresh failed
 */
async function notifyRefreshFailure(organizationId: string, errorMessage: string): Promise<void> {
  try {
    // Notify client
    await notificationService.notifyClient(organizationId, {
      type: 'token_expiring',
      title: 'Meta Connection Needs Attention',
      message: 'Your Meta access token could not be automatically refreshed. Please reconnect your Meta account to avoid service interruptions.',
      metadata: { error: errorMessage },
      priority: 'high',
    });

    // Notify admins
    await notificationService.notifyAdmins({
      type: 'token_refresh_failed',
      title: 'Token Refresh Failed',
      message: `Auto-refresh failed for organization ${organizationId}: ${errorMessage}`,
      metadata: { organizationId, error: errorMessage },
      priority: 'high',
    });
  } catch (notifyError: any) {
    logger.error('Token refresh worker: failed to send notifications', {
      organizationId,
      error: notifyError.message,
    });
  }
}

let intervalHandle: NodeJS.Timeout | null = null;

/**
 * Start the token refresh worker
 */
export function startTokenRefresher(): void {
  logger.info('Token refresh worker: started');

  // Run immediately on startup
  refreshExpiringTokens();

  // Then run on interval
  intervalHandle = setInterval(refreshExpiringTokens, REFRESH_INTERVAL_MS);
}

/**
 * Stop the token refresh worker
 */
export function stopTokenRefresher(): void {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
    logger.info('Token refresh worker: stopped');
  }
}

export default { startTokenRefresher, stopTokenRefresher };
