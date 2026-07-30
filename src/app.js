import 'dotenv/config';
import { Client, GatewayIntentBits } from 'discord.js';
import express from 'express';
import cron from 'node-cron';

import config from './config.js';
import { logger } from './utils/logger.js';
import { runSafeTask } from './utils/runSafeTask.js';
import { requireGrantApiKey } from './utils/internalApiAuth.js';
import { grantRolesForMember } from './services/subscriptions/subscriptionGrantService.js';
import { reconcileSubscriptionRoles } from './services/subscriptions/subscriptionRoleSync.js';

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

client.once('ready', () => {
  logger.info(`Logged in as ${client.user.tag}`);
});

function buildServer() {
  const app = express();
  app.use(express.json({ limit: '10kb' }));

  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', discordReady: client.isReady() });
  });

  app.post('/internal/subscriptions/grant', requireGrantApiKey, async (req, res) => {
    const { discordUserId, packageSlug } = req.body || {};
    if (!discordUserId || !packageSlug) {
      return res.status(400).json({ error: 'discordUserId and packageSlug are required' });
    }

    const result = await grantRolesForMember(client, { discordUserId, packageSlug });

    if (!result.ok) {
      if (result.reason === 'unknown_package_slug') {
        return res.status(400).json({ error: `Unknown packageSlug: ${packageSlug}` });
      }
      if (result.reason === 'member_not_found') {
        // Not a hard error - the reconciliation cron grants it once the member is
        // actually resolvable (handles this call racing the join).
        return res.status(202).json({ ok: false, reason: 'member_not_found' });
      }
      return res.status(503).json({ ok: false, reason: result.reason });
    }

    res.status(200).json({ ok: true, grantedRoleIds: result.grantedRoleIds });
  });

  app.use((err, req, res, next) => {
    logger.error('Unhandled web route error:', err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}

async function runReconcile() {
  const summary = await reconcileSubscriptionRoles(client);
  logger.info('Subscription role sync complete', summary);
}

let webServer;
let cronTask;

async function main() {
  const app = buildServer();
  webServer = app.listen(config.port, config.host, () => {
    logger.info(`Web server listening on ${config.host}:${config.port}`);
  });

  cronTask = cron.schedule(config.subscriptionSync.cronPattern, runSafeTask('subscription_role_sync', runReconcile));

  await client.login(config.discordToken);
}

async function shutdown(reason) {
  logger.info(`Shutting down (${reason})...`);
  try {
    cronTask?.stop();
    if (webServer) await new Promise((resolve) => webServer.close(resolve));
    if (client.isReady()) client.destroy();
  } catch (error) {
    logger.error('Error during shutdown:', error);
  }
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

main().catch((error) => {
  logger.error('Fatal error during startup:', error);
  process.exit(1);
});
