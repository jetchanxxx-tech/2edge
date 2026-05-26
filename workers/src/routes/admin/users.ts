import { Hono } from 'hono';
import { authMiddleware } from '../../middleware/auth';
import { adminMiddleware } from '../../middleware/admin';
import {
  getAdminUserList, updateUserByAdmin, banUser, deleteUser, createUserByAdmin,
  getUserProfile, resetUserUUID
} from '../../services/userService';

const router = new Hono<{ Bindings: Env }>();
router.use('*', authMiddleware, adminMiddleware);

// List users with pagination, search, filter
router.get('/', async (c) => {
  try {
    const page = parseInt(c.req.query('page') || '1');
    const per_page = parseInt(c.req.query('per_page') || '20');
    const search = c.req.query('search') || undefined;
    const status = c.req.query('status') || undefined;
    const sort_by = c.req.query('sort_by') || 'id';
    const sort_order = c.req.query('sort_order') || 'DESC';

    const result = await getAdminUserList(c.env.DB, { page, per_page, search, status, sort_by, sort_order });
    return c.json(result);
  } catch (e) {
    console.error('Admin user list error:', e);
    return c.json({ error: { code: 'INTERNAL_ERROR', message: '服务器内部错误' } }, 500);
  }
});

// Get single user
router.get('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    if (isNaN(id)) return c.json({ error: { code: 'INVALID_ID', message: '无效的用户ID' } }, 400);

    const user = await getUserProfile(c.env.DB, id);
    if (!user) return c.json({ error: { code: 'NOT_FOUND', message: '用户不存在' } }, 404);

    return c.json({ data: user, message: 'success' });
  } catch {
    return c.json({ error: { code: 'INTERNAL_ERROR', message: '服务器内部错误' } }, 500);
  }
});

// Create user
router.post('/', async (c) => {
  try {
    const body = await c.req.json<{ email: string; password: string }>();
    if (!body.email || !body.password || body.password.length < 6) {
      return c.json({ error: { code: 'VALIDATION_ERROR', message: '邮箱和密码(≥6位)不能为空' } }, 422);
    }

    const result = await createUserByAdmin(c.env.DB, body);
    if (!result.success) {
      return c.json({ error: { code: result.error, message: result.message } }, 409);
    }

    // Audit log
    const adminUser = c.get('user');
    await logAudit(c.env.DB, adminUser.sub, 'user_create', 'user', result.data!.id, `Created user ${body.email}`);

    return c.json({ data: result.data, message: '用户创建成功' }, 201);
  } catch {
    return c.json({ error: { code: 'INTERNAL_ERROR', message: '服务器内部错误' } }, 500);
  }
});

// Update user
router.put('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    if (isNaN(id)) return c.json({ error: { code: 'INVALID_ID', message: '无效的用户ID' } }, 400);

    const body = await c.req.json<Record<string, unknown>>();
    const result = await updateUserByAdmin(c.env.DB, id, body);
    if (!result.success) {
      return c.json({ error: { code: result.error, message: result.message } }, 400);
    }

    const adminUser = c.get('user');
    await logAudit(c.env.DB, adminUser.sub, 'user_update', 'user', id, JSON.stringify(body));

    return c.json({ data: null, message: result.message });
  } catch {
    return c.json({ error: { code: 'INTERNAL_ERROR', message: '服务器内部错误' } }, 500);
  }
});

// Ban/unban user
router.post('/:id/ban', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    if (isNaN(id)) return c.json({ error: { code: 'INVALID_ID', message: '无效的用户ID' } }, 400);

    const result = await banUser(c.env.DB, id);
    if (!result.success) {
      return c.json({ error: { code: result.error, message: result.message } }, 400);
    }

    const action = result.data!.banned ? 'user_ban' : 'user_unban';
    const adminUser = c.get('user');
    await logAudit(c.env.DB, adminUser.sub, action, 'user', id);

    return c.json({ data: result.data, message: result.data!.banned ? '用户已封禁' : '用户已解封' });
  } catch {
    return c.json({ error: { code: 'INTERNAL_ERROR', message: '服务器内部错误' } }, 500);
  }
});

// Delete user
router.delete('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    if (isNaN(id)) return c.json({ error: { code: 'INVALID_ID', message: '无效的用户ID' } }, 400);

    const result = await deleteUser(c.env.DB, id);
    if (!result.success) {
      return c.json({ error: { code: result.error, message: result.message } }, 400);
    }

    const adminUser = c.get('user');
    await logAudit(c.env.DB, adminUser.sub, 'user_delete', 'user', id);

    return c.json({ data: null, message: result.message });
  } catch {
    return c.json({ error: { code: 'INTERNAL_ERROR', message: '服务器内部错误' } }, 500);
  }
});

// Batch operations
router.post('/batch', async (c) => {
  try {
    const body = await c.req.json<{ action: string; ids: number[] }>();
    if (!body.ids || !Array.isArray(body.ids) || body.ids.length === 0) {
      return c.json({ error: { code: 'VALIDATION_ERROR', message: '请提供要操作的用户ID列表' } }, 422);
    }

    const adminUser = c.get('user');
    const results: string[] = [];

    for (const id of body.ids) {
      if (body.action === 'ban') {
        await banUser(c.env.DB, id);
        results.push(`User ${id} banned`);
        await logAudit(c.env.DB, adminUser.sub, 'user_ban_batch', 'user', id);
      } else if (body.action === 'delete') {
        const r = await deleteUser(c.env.DB, id);
        if (r.success) {
          results.push(`User ${id} deleted`);
          await logAudit(c.env.DB, adminUser.sub, 'user_delete_batch', 'user', id);
        } else {
          results.push(`User ${id} failed: ${r.message}`);
        }
      } else if (body.action === 'reset_uuid') {
        const r = await resetUserUUID(c.env.DB, id);
        if (r.success) results.push(`User ${id} UUID reset`);
        await logAudit(c.env.DB, adminUser.sub, 'user_reset_uuid_batch', 'user', id);
      }
    }

    return c.json({ data: { results }, message: '批量操作完成' });
  } catch {
    return c.json({ error: { code: 'INTERNAL_ERROR', message: '服务器内部错误' } }, 500);
  }
});

// Export CSV
router.post('/export-csv', async (c) => {
  try {
    const body = await c.req.json<{ ids?: number[] }>();
    let users;

    if (body.ids && body.ids.length > 0) {
      const placeholders = body.ids.map(() => '?').join(',');
      users = await c.env.DB.prepare(
        `SELECT email, uuid, token, transfer_enable, u, d, banned, expired_at, created_at
         FROM users WHERE id IN (${placeholders})`
      ).bind(...body.ids).all<Record<string, unknown>>();
    } else {
      users = await c.env.DB.prepare(
        `SELECT email, uuid, token, transfer_enable, u, d, banned, expired_at, created_at
         FROM users ORDER BY id`
      ).all<Record<string, unknown>>();
    }

    const header = 'email,uuid,token,transfer_enable,upload,download,banned,expired_at,created_at\n';
    const rows = users.results.map((u: Record<string, unknown>) =>
      `"${u.email}","${u.uuid}","${u.token}",${u.transfer_enable},${u.u},${u.d},${u.banned},${u.expired_at || ''},${u.created_at}`
    ).join('\n');

    c.header('Content-Type', 'text/csv; charset=utf-8');
    c.header('Content-Disposition', 'attachment; filename=users.csv');
    return c.text(header + rows);
  } catch {
    return c.json({ error: { code: 'INTERNAL_ERROR', message: '服务器内部错误' } }, 500);
  }
});

async function logAudit(db: D1Database, adminId: number, action: string, targetType: string, targetId: number, details?: string) {
  const now = Math.floor(Date.now() / 1000);
  await db.prepare(
    `INSERT INTO admin_audit_log (admin_id, action, target_type, target_id, details, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(adminId, action, targetType, targetId, details || null, now).run();
}

export { router as adminUsersRouter };
