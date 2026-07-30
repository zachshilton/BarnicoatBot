import { logger } from './utils/logger.js';

const roleMap = {
  authority: [process.env.ROLE_ID_AUTHORITY, process.env.ROLE_ID_DELUXE_MEMBER].filter(Boolean),
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
