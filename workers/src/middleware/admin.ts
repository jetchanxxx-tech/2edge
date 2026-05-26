import type { Context, Next } from 'hono';

export async function adminMiddleware(c: Context, next: Next): Promise<Response | void> {
  const user = c.get('user');

  if (!user || user.is_admin !== 1) {
    return c.json({ error: { code: 'FORBIDDEN', message: 'Admin access required' } }, 403);
  }

  return next();
}
