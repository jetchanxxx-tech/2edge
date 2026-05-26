import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import {
  getUserProfile, changePassword, resetUserUUID, resetUserToken, getUserTraffic
} from '../services/userService';

const router = new Hono<{ Bindings: Env }>();
router.use('*', authMiddleware);

router.get('/profile', async (c) => {
  try {
    const user = c.get('user');
    const profile = await getUserProfile(c.env.DB, user.sub);
    if (!profile) {
      return c.json({ error: { code: 'NOT_FOUND', message: '用户不存在' } }, 404);
    }
    return c.json({ data: profile, message: 'success' });
  } catch {
    return c.json({ error: { code: 'INTERNAL_ERROR', message: '服务器内部错误' } }, 500);
  }
});

router.post('/change-password', async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json<{ old_password: string; new_password: string }>();
    if (!body.old_password || !body.new_password) {
      return c.json({ error: { code: 'VALIDATION_ERROR', message: '密码不能为空' } }, 422);
    }
    if (body.new_password.length < 6) {
      return c.json({ error: { code: 'VALIDATION_ERROR', message: '新密码长度至少6位' } }, 422);
    }

    const result = await changePassword(c.env.DB, user.sub, body.old_password, body.new_password);
    if (!result.success) {
      return c.json({ error: { code: result.error, message: result.message } }, 400);
    }
    return c.json({ data: null, message: result.message });
  } catch {
    return c.json({ error: { code: 'INTERNAL_ERROR', message: '服务器内部错误' } }, 500);
  }
});

router.post('/reset-uuid', async (c) => {
  try {
    const user = c.get('user');
    const result = await resetUserUUID(c.env.DB, user.sub);
    return c.json({ data: result.data, message: 'UUID 已重置' });
  } catch {
    return c.json({ error: { code: 'INTERNAL_ERROR', message: '服务器内部错误' } }, 500);
  }
});

router.post('/reset-token', async (c) => {
  try {
    const user = c.get('user');
    const result = await resetUserToken(c.env.DB, user.sub);
    return c.json({ data: result.data, message: '订阅令牌已重置' });
  } catch {
    return c.json({ error: { code: 'INTERNAL_ERROR', message: '服务器内部错误' } }, 500);
  }
});

router.get('/traffic', async (c) => {
  try {
    const user = c.get('user');
    const days = parseInt(c.req.query('days') || '30');
    const traffic = await getUserTraffic(c.env.DB, user.sub, Math.min(days, 90));
    return c.json({ data: traffic, message: 'success' });
  } catch {
    return c.json({ error: { code: 'INTERNAL_ERROR', message: '服务器内部错误' } }, 500);
  }
});

router.get('/subscription', async (c) => {
  try {
    const user = c.get('user');
    const profile = await getUserProfile(c.env.DB, user.sub);
    if (!profile) {
      return c.json({ error: { code: 'NOT_FOUND', message: '用户不存在' } }, 404);
    }

    const siteUrl = c.env.SITE_URL || new URL(c.req.url).origin.replace('api.', '');
    const subUrl = `${siteUrl}/api/v1/sub/${profile.token}`;

    return c.json({
      data: {
        token: profile.token,
        subscribe_url: subUrl,
        uuid: profile.uuid,
        transfer_enable: profile.transfer_enable,
        u: profile.u,
        d: profile.d,
        expired_at: profile.expired_at,
      },
      message: 'success'
    });
  } catch {
    return c.json({ error: { code: 'INTERNAL_ERROR', message: '服务器内部错误' } }, 500);
  }
});

export { router as userRouter };
