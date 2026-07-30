import { logger } from '../../utils/logger.js';
import config from '../../config.js';
import { getRoleIdsForPackageSlug } from './roleMapping.js';
import { reportAction } from './actionReporter.js';

export async function grantRolesForMember(client, { discordUserId, packageSlug }, source = 'instant') {
  const guild = client.guilds.cache.get(config.subscriptionSync.guildId);
  if (!guild) return { ok: false, reason: 'guild_not_found' };

  const roleIds = getRoleIdsForPackageSlug(packageSlug);
  if (!roleIds) return { ok: false, reason: 'unknown_package_slug' };

  const member = await guild.members.fetch(discordUserId).catch(() => null);
  if (!member) return { ok: false, reason: 'member_not_found' };

  const grantedRoleIds = [];
  for (const roleId of roleIds) {
    if (member.roles.cache.has(roleId)) continue;
    try {
      await member.roles.add(roleId, `Subscription grant (${packageSlug})`);
      grantedRoleIds.push(roleId);
    } catch (error) {
      logger.warn(`Failed to grant role ${roleId} to ${discordUserId}:`, error.message);
    }
  }

  if (grantedRoleIds.length > 0) {
    await reportAction({ discordUserId, packageSlug, action: 'grant', roleIds: grantedRoleIds, source });
  }

  return { ok: true, grantedRoleIds };
}

export async function revokeAllManagedRoles(client, discordUserId, allManagedRoleIds, packageSlug, source = 'reconcile') {
  const guild = client.guilds.cache.get(config.subscriptionSync.guildId);
  if (!guild) return { ok: false, reason: 'guild_not_found' };

  const member = await guild.members.fetch(discordUserId).catch(() => null);
  if (!member) return { ok: false, reason: 'member_not_found' };

  const revokedRoleIds = [];
  for (const roleId of allManagedRoleIds) {
    if (!member.roles.cache.has(roleId)) continue;
    try {
      await member.roles.remove(roleId, 'Subscription no longer active');
      revokedRoleIds.push(roleId);
    } catch (error) {
      logger.warn(`Failed to revoke role ${roleId} from ${discordUserId}:`, error.message);
    }
  }

  if (revokedRoleIds.length > 0) {
    await reportAction({ discordUserId, packageSlug, action: 'revoke', roleIds: revokedRoleIds, source });
  }

  return { ok: true, revokedRoleIds };
}
