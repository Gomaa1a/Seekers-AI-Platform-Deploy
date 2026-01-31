/**
 * Free Tier Trial Worker
 * Runs periodically to disconnect expired free tier trials
 */

import { logger } from '../config';
import { freeTierService } from '../services/freeTier.service';

const CHECK_INTERVAL_MS = 5 * 60 * 1000; // Run every 5 minutes

let intervalId: NodeJS.Timeout | null = null;
let isRunning = false;

/**
 * Process expired free tier trials and disconnect them
 */
async function processExpiredTrials(): Promise<void> {
  if (isRunning) {
    logger.debug('Free tier worker: previous run still in progress, skipping');
    return;
  }

  isRunning = true;
  logger.debug('Free tier worker: checking for expired trials');

  try {
    const disconnectedCount = await freeTierService.processExpiredTrials();
    
    if (disconnectedCount > 0) {
      logger.info(`Free tier worker: disconnected ${disconnectedCount} expired trial(s)`);
    }
  } catch (error: any) {
    logger.error('Free tier worker: error processing expired trials', { 
      error: error.message 
    });
  } finally {
    isRunning = false;
  }
}

/**
 * Start the free tier trial worker
 */
export function startFreeTierWorker(): void {
  if (intervalId) {
    logger.warn('Free tier worker: already running');
    return;
  }

  logger.info('Free tier worker: starting');
  
  // Run immediately on startup
  processExpiredTrials();
  
  // Then run on interval
  intervalId = setInterval(processExpiredTrials, CHECK_INTERVAL_MS);
  
  logger.info(`Free tier worker: scheduled to run every ${CHECK_INTERVAL_MS / 1000 / 60} minutes`);
}

/**
 * Stop the free tier trial worker
 */
export function stopFreeTierWorker(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    logger.info('Free tier worker: stopped');
  }
}

/**
 * Manually trigger expired trial processing
 */
export async function triggerExpiredTrialProcessing(): Promise<number> {
  return freeTierService.processExpiredTrials();
}

export default {
  start: startFreeTierWorker,
  stop: stopFreeTierWorker,
  processNow: triggerExpiredTrialProcessing,
};
