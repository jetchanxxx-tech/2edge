import { Hono } from 'hono';
import { subscriptionRateLimit } from '../middleware/rateLimit';

const router = new Hono<{ Bindings: Env }>();

// GET /api/v1/sub/:token - Subscription endpoint for proxy clients
router.get('/:token', subscriptionRateLimit, async (c) => {
  try {
    const token = c.req.param('token');
    if (!token) {
      return c.json({ error: { code: 'INVALID_TOKEN', message: 'Token is required' } }, 400);
    }

    const user = await c.env.DB.prepare(
      `SELECT uuid, transfer_enable, u, d, expired_at, banned
       FROM users WHERE token = ?`
    ).bind(token).first<{
      uuid: string; transfer_enable: number; u: number; d: number;
      expired_at: number | null; banned: number;
    }>();

    if (!user) {
      return c.text('Not Found', 404);
    }

    if (user.banned === 1) {
      return c.text('Forbidden', 403);
    }

    if (user.expired_at && user.expired_at < Math.floor(Date.now() / 1000)) {
      return c.text('Expired', 403);
    }

    // Get the host from request or config
    const proxyHost = c.env.PROXY_HOST || new URL(c.req.url).hostname;
    const protocol = 'https';
    const path = c.env.PROXY_PATH || '';
    const host = c.env.PROXY_HOST || new URL(c.req.url).hostname;

    // Generate VLESS subscription links
    const vlessLink = `vless://${user.uuid}@${host}:443?encryption=none&security=tls&sni=${host}&type=ws&host=${host}&path=${path}%3Fed%3D2048#2Edge`;

    // Traffic info header
    const upload = user.u;
    const download = user.d;
    const total = user.transfer_enable;
    const expire = user.expired_at || 0;

    c.header('Subscription-Userinfo', `upload=${upload}; download=${download}; total=${total}; expire=${expire}`);
    c.header('Content-Type', 'text/plain; charset=utf-8');
    c.header('Profile-Update-Interval', '12');

    // Return base64 encoded subscription for broad compatibility
    const subContent = btoa(vlessLink + '\n');
    return c.text(subContent);
  } catch (e) {
    console.error('Subscription generation error:', e);
    return c.text('Internal Server Error', 500);
  }
});

export { router as subscriptionRouter };
