import axios from 'axios';
import { logger } from '../../utils/logger.js';
import config from '../../config.js';
import { grantRolesForMember, revokeAllManagedRoles } from './subscriptionGrantService.js';
import { getAllManagedRoleIds } from './roleMapping.js';

async function fetchEntitlements() {
  const response = await axios.get(config.subscriptionSync.entitlementsApiUrl, {
    headers: { Authorization: `Bearer ${config.subscriptionSync.entitlementsApiKey}` },
    timeout: 10000,
  });
  return response.data?.entitlements || [];
}

/** Safety-net grant for anyone the instant-grant call missed, plus revocation for anyone no longer active. */
export async function reconcileSubscriptionRoles(client) {
  const summary = { entitlementsProcessed: 0, rolesGranted: 0, rolesRevoked: 0, errors: 0 };

  if (!config.subscriptionSync.enabled) {
    logger.warn('Subscription role sync skipped - not configured');
    return summary;
  }

  const guild = client.guilds.cache.get(config.subscriptionSync.guildId);
  if (!guild) {
    logger.warn(`Subscription role sync skipped - guild ${config.subscriptionSync.guildId} not in cache`);
    return summary;
  }

  let entitlements;
  try {
    entitlements = await fetchEntitlements();
  } catch (error) {
    summary.errors += 1;
    logger.warn('Subscription role sync failed to fetch entitlements:', error.message);
    return summary;
  }

  const allManagedRoleIds = getAllManagedRoleIds();

  for (const entitlement of entitlements) {
    summary.entitlementsProcessed += 1;
    try {
      const result = entitlement.active
        ? await grantRolesForMember(client, entitlement)
        : await revokeAllManagedRoles(client, entitlement.discordUserId, allManagedRoleIds);

      if (result.ok) {
        summary.rolesGranted += result.grantedRoleIds?.length || 0;
        summary.rolesRevoked += result.revokedRoleIds?.length || 0;
      }
    } catch (error) {
      summary.errors += 1;
      logger.warn(`Subscription role sync failed for ${entitlement.discordUserId}:`, error.message);
    }
  }

  return summary;
}
