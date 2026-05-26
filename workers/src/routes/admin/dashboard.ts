import { Hono } from 'hono';
import { authMiddleware } from '../../middleware/auth';
import { adminMiddleware } from '../../middleware/admin';

const router = new Hono<{ Bindings: Env }>();
router.use('*', authMiddleware, adminMiddleware);

router.get('/', async (c) => {
  try {
    const db = c.env.DB;

    const [{ total: totalUsers }] = (await db.prepare('SELECT COUNT(*) as total FROM users').all<{ total: number }>()).results;
    const [{ total: activeUsers }] = (await db.prepare('SELECT COUNT(*) as total FROM users WHERE banned = 0').all<{ total: number }>()).results;
    const [{ total: bannedUsers }] = (await db.prepare('SELECT COUNT(*) as total FROM users WHERE banned = 1').all<{ total: number }>()).results;
    const [{ total: totalU }] = (await db.prepare('SELECT COALESCE(SUM(u), 0) as total FROM users').all<{ total: number }>()).results;
    const [{ total: totalD }] = (await db.prepare('SELECT COALESCE(SUM(d), 0) as total FROM users').all<{ total: number }>()).results;

    // Last 7 days registrations
    const weekAgo = Math.floor(Date.now() / 1000) - 7 * 86400;
    const [{ total: recentRegs }] = (await db.prepare(
      'SELECT COUNT(*) as total FROM users WHERE created_at >= ?'
    ).bind(weekAgo).all<{ total: number }>()).results;

    return c.json({
      data: {
        total_users: totalUsers,
        active_users: activeUsers,
        banned_users: bannedUsers,
        total_traffic_u: totalU,
        total_traffic_d: totalD,
        recent_registrations: recentRegs,
      },
      message: 'success'
    });
  } catch {
    return c.json({ error: { code: 'INTERNAL_ERROR', message: '服务器内部错误' } }, 500);
  }
});

export { router as adminDashboardRouter };
