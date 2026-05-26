import { Hono } from 'hono';
import { registerUser, loginUser } from '../services/authService';
import { registerRateLimit, loginRateLimit } from '../middleware/rateLimit';

const router = new Hono<{ Bindings: Env }>();

router.post('/register', registerRateLimit, async (c) => {
  try {
    const body = await c.req.json<{ email: string; password: string }>();
    if (!body.email || !body.password) {
      return c.json({ error: { code: 'VALIDATION_ERROR', message: '邮箱和密码不能为空' } }, 422);
    }
    if (body.password.length < 6) {
      return c.json({ error: { code: 'VALIDATION_ERROR', message: '密码长度至少6位' } }, 422);
    }

    const result = await registerUser(c.env, body);
    if (!result.success) {
      const status = result.error === 'REGISTRATION_DISABLED' ? 403 : 409;
      return c.json({ error: { code: result.error, message: result.message } }, status);
    }

    return c.json({ data: result.data, message: '注册成功' }, 201);
  } catch {
    return c.json({ error: { code: 'INTERNAL_ERROR', message: '服务器内部错误' } }, 500);
  }
});

router.post('/login', loginRateLimit, async (c) => {
  try {
    const body = await c.req.json<{ email: string; password: string }>();
    if (!body.email || !body.password) {
      return c.json({ error: { code: 'VALIDATION_ERROR', message: '邮箱和密码不能为空' } }, 422);
    }

    const result = await loginUser(c.env, body);
    if (!result.success) {
      const status = result.error === 'BANNED' ? 403 : 401;
      return c.json({ error: { code: result.error, message: result.message } }, status);
    }

    return c.json({ data: result.data, message: '登录成功' });
  } catch {
    return c.json({ error: { code: 'INTERNAL_ERROR', message: '服务器内部错误' } }, 500);
  }
});

export { router as authRouter };
