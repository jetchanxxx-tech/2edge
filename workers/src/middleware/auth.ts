import type { Context, Next } from 'hono';
import type { JwtPayload } from '../utils/jwt';
import { verifyToken } from '../utils/jwt';

export async function authMiddleware(c: Context, next: Next): Promise<Response | void> {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: { code: 'UNAUTHORIZED', message: 'Missing or invalid Authorization header' } }, 401);
  }

  const token = authHeader.slice(7);
  const env = c.env as Env;
  let jwtSecret = env.JWT_SECRET;

  if (!jwtSecret) {
    const { results } = await env.DB.prepare(
      "SELECT value FROM system_config WHERE key = 'jwt_secret'"
    ).all<{ value: string }>();
    if (results.length > 0 && results[0].value) {
      jwtSecret = results[0].value;
    }
  }

  if (!jwtSecret) {
    return c.json({ error: { code: 'CONFIG_ERROR', message: 'JWT secret not configured' } }, 500);
  }

  const payload = await verifyToken(token, jwtSecret);

  if (!payload) {
    return c.json({ error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' } }, 401);
  }

  // Check if user is banned
  const { results } = await env.DB.prepare(
    'SELECT banned FROM users WHERE id = ?'
  ).bind(payload.sub).all<{ banned: number }>();

  if (results.length === 0 || results[0].banned === 1) {
    return c.json({ error: { code: 'FORBIDDEN', message: 'Account is banned or deleted' } }, 403);
  }

  c.set('user', payload);
  return next();
}
