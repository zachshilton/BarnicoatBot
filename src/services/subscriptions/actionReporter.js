import axios from 'axios';
import { logger } from '../../utils/logger.js';
import config from '../../config.js';

/** Reports a role change back to bb-onboarding-automation for its admin activity log - best-effort. */
export async function reportAction({ discordUserId, packageSlug, action, roleIds, source }) {
  if (!config.subscriptionSync.enabled || roleIds.length === 0) return;

  try {
    await axios.post(
      config.subscriptionSync.discordActionsApiUrl,
      { discordUserId, packageSlug, action, roleIds, source },
      {
        headers: { Authorization: `Bearer ${config.subscriptionSync.entitlementsApiKey}` },
        timeout: 5000,
      }
    );
  } catch (error) {
    logger.warn(`Failed to report ${action} action for ${discordUserId}:`, error.message);
  }
}
