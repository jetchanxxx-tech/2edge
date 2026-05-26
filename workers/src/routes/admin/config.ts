import { Hono } from 'hono';
import { authMiddleware } from '../../middleware/auth';
import { adminMiddleware } from '../../middleware/admin';

const router = new Hono<{ Bindings: Env }>();
router.use('*', authMiddleware, adminMiddleware);

router.get('/', async (c) => {
  try {
    const configs = await c.env.DB.prepare(
      'SELECT key, value, updated_at FROM system_config ORDER BY key'
    ).all<{ key: string; value: string; updated_at: number }>();

    const configMap: Record<string, string> = {};
    for (const row of configs.results) {
      configMap[row.key] = row.value;
    }

    return c.json({ data: configMap, message: 'success' });
  } catch {
    return c.json({ error: { code: 'INTERNAL_ERROR', message: '服务器内部错误' } }, 500);
  }
});

router.put('/', async (c) => {
  try {
    const body = await c.req.json<Record<string, string>>();
    const allowedKeys = ['site_name', 'register_enabled', 'default_traffic_gb'];
    const now = Math.floor(Date.now() / 1000);

    for (const [key, value] of Object.entries(body)) {
      if (allowedKeys.includes(key)) {
        await c.env.DB.prepare(
          'INSERT OR REPLACE INTO system_config (key, value, updated_at) VALUES (?, ?, ?)'
        ).bind(key, value, now).run();
      }
    }

    // Audit
    const adminUser = c.get('user');
    await c.env.DB.prepare(
      'INSERT INTO admin_audit_log (admin_id, action, target_type, details, created_at) VALUES (?, ?, ?, ?, ?)'
    ).bind(adminUser.sub, 'config_update', 'config', JSON.stringify(body), now).run();

    return c.json({ data: null, message: '配置已更新' });
  } catch {
    return c.json({ error: { code: 'INTERNAL_ERROR', message: '服务器内部错误' } }, 500);
  }
});

export { router as adminConfigRouter };
