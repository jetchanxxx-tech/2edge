import { Hono } from 'hono';
import { authMiddleware } from '../../middleware/auth';
import { adminMiddleware } from '../../middleware/admin';

const router = new Hono<{ Bindings: Env }>();
router.use('*', authMiddleware, adminMiddleware);

router.get('/', async (c) => {
  try {
    const page = parseInt(c.req.query('page') || '1');
    const per_page = parseInt(c.req.query('per_page') || '20');
    const offset = (page - 1) * per_page;

    const [{ total }] = (await c.env.DB.prepare(
      'SELECT COUNT(*) as total FROM admin_audit_log'
    ).all<{ total: number }>()).results;

    const logs = await c.env.DB.prepare(
      `SELECT a.id, a.admin_id, u.email as admin_email, a.action, a.target_type,
              a.target_id, a.details, a.ip, a.created_at
       FROM admin_audit_log a
       LEFT JOIN users u ON a.admin_id = u.id
       ORDER BY a.created_at DESC
       LIMIT ? OFFSET ?`
    ).bind(per_page, offset).all();

    return c.json({
      data: logs.results,
      meta: {
        current_page: page,
        per_page,
        total,
        last_page: Math.ceil(total / per_page),
      },
      message: 'success'
    });
  } catch {
    return c.json({ error: { code: 'INTERNAL_ERROR', message: '服务器内部错误' } }, 500);
  }
});

export { router as adminAuditRouter };
