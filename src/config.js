import { logger } from './utils/logger.js';

// Keyed by the package slug bb-onboarding-automation reports in /internal/entitlements.
// Authority was renamed there to the Social Media Success Program; ROLE_ID_AUTHORITY is
// still read as a fallback so the existing role can stay configured as-is.
//
// Motion and Ignite are retired (no new sales) but deliberately kept here. This map does
// double duty: getAllManagedRoleIds() is the set revokeAllManagedRoles() strips from anyone
// no longer active, so dropping these entries would leave lapsed Motion/Ignite members
// holding their roles permanently - and would also strip roles from existing subscribers
// who are still legitimately active on those packages.
const smspRoleIds = [
  process.env.ROLE_ID_SOCIAL_MEDIA_SUCCESS_PROGRAM || process.env.ROLE_ID_AUTHORITY,
  process.env.ROLE_ID_DELUXE_MEMBER,
].filter(Boolean);

const roleMap = {
  social_media_success_program: smspRoleIds,
  // Transitional alias: bb-onboarding-automation only starts reporting the new slug once
  // its schema migration has run, and the two deploy independently. Accepting both means
  // this bot works either side of that change instead of having to land in lockstep.
  // Safe to delete once the migration is applied - the old slug can never appear again.
  authority: smspRoleIds,
  motion: [process.env.ROLE_ID_MOTION, process.env.ROLE_ID_DELUXE_MEMBER].filter(Boolean),
  ignite: [process.env.ROLE_ID_IGNITE, process.env.ROLE_ID_DELUXE_MEMBER].filter(Boolean),
  inner_circle: [process.env.ROLE_ID_INNER_CIRCLE].filter(Boolean),
};

const subscriptionSync = {
  enabled: Boolean(
    process.env.ENTITLEMENTS_API_URL &&
      process.env.ENTITLEMENTS_API_KEY &&
      process.env.SUBSCRIPTION_GRANT_API_KEY &&
      process.env.GUILD_ID
  ),
  guildId: process.env.GUILD_ID,
  entitlementsApiUrl: process.env.ENTITLEMENTS_API_URL,
  // Same host as ENTITLEMENTS_API_URL, different path - reported actions feed the admin activity log.
  discordActionsApiUrl: process.env.ENTITLEMENTS_API_URL
    ? new URL('/internal/discord-actions', process.env.ENTITLEMENTS_API_URL).toString()
    : undefined,
  entitlementsApiKey: process.env.ENTITLEMENTS_API_KEY,
  grantApiKey: process.env.SUBSCRIPTION_GRANT_API_KEY,
  cronPattern: process.env.SUBSCRIPTION_SYNC_CRON || '*/15 * * * *',
  roleMap,
};

const config = {
  discordToken: process.env.DISCORD_TOKEN,
  port: Number(process.env.PORT) || 3000,
  host: process.env.WEB_HOST || '0.0.0.0',
  subscriptionSync,
};

if (!subscriptionSync.enabled) {
  logger.warn(
    'Subscription sync not configured (ENTITLEMENTS_API_URL/ENTITLEMENTS_API_KEY/SUBSCRIPTION_GRANT_API_KEY/GUILD_ID) - grant route will reject and the reconciliation cron will skip'
  );
}

export default config;
