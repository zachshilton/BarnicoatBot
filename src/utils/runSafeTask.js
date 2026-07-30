import { logger } from './logger.js';

/** Wraps a cron task so a thrown error is logged instead of crashing the scheduler. */
export function runSafeTask(taskName, fn) {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      logger.error(`[cron:${taskName}] failed:`, error);
      return null;
    }
  };
}
