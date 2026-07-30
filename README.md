# BarnicoatBot

A small, single-purpose Discord bot: it keeps Discord roles in sync with subscription status from [bb-onboarding-automation](https://github.com/zachshilton/bb-onboarding-automation). It does nothing else - no commands, no moderation, no economy/music/tickets/etc. (this repo used to run the open-source "TitanBot" community-bot template; that's been removed).

## How it works

1. When a buyer joins the Discord server via their personal invite, bb-onboarding-automation calls this bot's `POST /internal/subscriptions/grant` with their Discord user ID and package slug, and their role(s) are granted immediately.
2. Every 15 minutes (configurable), this bot calls bb-onboarding-automation's `GET /internal/entitlements` and reconciles every known Discord user's roles against their current subscription status - granting anything missed by step 1, and revoking roles from anyone whose subscription is no longer active (refunded/cancelled).

Both directions are authenticated with independent shared-secret Bearer keys - this bot never has direct database access to bb-onboarding-automation, only this narrow API.

This bot has no database of its own, so every role it actually grants or revokes (not every check - only real changes) is also reported back to bb-onboarding-automation's `POST /internal/discord-actions`, which is what powers that dashboard's "Discord Bot" activity log.

## Role mapping

- **Inner Circle** -> its own role only.
- **Authority / Motion / Ignite** -> each their own role, plus the shared **Deluxe Member** role.

Configured via the `ROLE_ID_*` env vars - see `.env.example`.

## Setup

```bash
npm install
cp .env.example .env   # fill in the values described in the file
npm start
```

Required env vars: `DISCORD_TOKEN`, `GUILD_ID`, `ENTITLEMENTS_API_URL`, `ENTITLEMENTS_API_KEY`, `SUBSCRIPTION_GRANT_API_KEY`, and the five `ROLE_ID_*` vars. The bot logs a warning and disables the sync (route rejects, cron skips) if any of the core integration vars are missing, rather than crashing.

### Discord bot setup

- Developer Portal -> your application -> Bot -> requires only the **Server Members Intent** (Guild Members) - no message content or other privileged intents are needed.
- OAuth2 URL Generator: scope `bot`, permission **Manage Roles** only. The bot's role must be positioned above every role listed in `ROLE_ID_*` in the server's role list, or role grants/revokes will silently fail.

### bb-onboarding-automation side

That project needs matching env vars set (`BARNICOAT_GRANT_URL` pointing at this bot's `/internal/subscriptions/grant`, plus `BARNICOAT_GRANT_API_KEY` and `ENTITLEMENTS_API_KEY` - see its own `.env.example`). Generate the two shared secrets with e.g. `openssl rand -hex 32` and set the matching value on both sides.

## Deploying

Docker: `docker compose up -d --build`. Railway: connect this repo, set the env vars above in the Variables tab. Health check: `GET /health`.
