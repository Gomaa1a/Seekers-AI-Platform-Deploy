import Bull, { Job } from 'bull';
import { config, logger } from '../config';

/**
 * Debounce queue for the live AI agent.
 *
 * The "buffering pain point": a customer often fires several quick messages
 * in a row ("hi", "are you there", "do you ship to Cairo?"). Replying to each
 * one separately is slow, expensive, and feels robotic. Instead we buffer the
 * raw messages in Redis and schedule a *single* delayed flush per conversation.
 * Each new message resets the timer, so the agent only answers once the
 * customer pauses — then it sees the whole burst as one turn.
 */

export interface AgentFlushKey {
  platform: 'facebook' | 'instagram';
  assetId: string; // page id or instagram id that received the message
  senderId: string; // the customer
}

const DELAY_MS = Math.max(1, config.ai.bufferSeconds) * 1000;

const bufferQueue = new Bull<AgentFlushKey>('agent-reply-buffer', {
  redis: {
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password || undefined,
  },
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 200,
    attempts: 2,
    backoff: { type: 'fixed', delay: 3000 },
  },
});

/**
 * Build a stable job id so repeated messages from the same customer collapse
 * onto one debounced flush.
 */
function jobIdFor(key: AgentFlushKey): string {
  return `flush:${key.platform}:${key.assetId}:${key.senderId}`;
}

/**
 * Schedule (or reschedule) the flush for a conversation. Removing the pending
 * job before re-adding is what makes this a debounce rather than a fixed timer.
 */
export async function scheduleAgentFlush(key: AgentFlushKey): Promise<void> {
  const jobId = jobIdFor(key);
  try {
    const existing = await bufferQueue.getJob(jobId);
    if (existing) {
      try {
        await existing.remove();
      } catch {
        /* already processing — the fresh add below still covers new messages */
      }
    }
  } catch (error) {
    logger.warn('Could not check existing flush job', { jobId, error });
  }
  await bufferQueue.add(key, { jobId, delay: DELAY_MS });
}

bufferQueue.process(async (job: Job<AgentFlushKey>) => {
  // Lazy import avoids a circular dependency (liveAgentService schedules flushes).
  const { liveAgentService } = await import('../services/liveAgent.service');
  await liveAgentService.flush(job.data);
  return { ok: true };
});

bufferQueue.on('failed', (job, error) => {
  logger.error('Agent flush job failed', {
    jobId: job?.id,
    key: job?.data,
    error: error.message,
  });
});

export { bufferQueue };
export default bufferQueue;
