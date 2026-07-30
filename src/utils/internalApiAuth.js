import crypto from 'crypto';
import config from '../config.js';

function safeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
}

export function requireGrantApiKey(req, res, next) {
  if (!config.subscriptionSync.enabled) {
    return res.status(503).json({ error: 'Subscription sync is not configured' });
  }

  const [scheme, token] = (req.get('Authorization') || '').split(' ');
  if (scheme !== 'Bearer' || !token || !safeEqual(token, config.subscriptionSync.grantApiKey)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
}
