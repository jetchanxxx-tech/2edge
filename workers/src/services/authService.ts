import { hashPassword, verifyPassword } from '../utils/crypto';
import { generateUUID, generateToken } from '../utils/uuid';
import { createToken } from '../utils/jwt';

export interface RegisterInput {
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export async function registerUser(env: { DB: D1Database; JWT_SECRET: string; KV?: KVNamespace }, input: RegisterInput) {
  const db = env.DB;
  const email = input.email.toLowerCase().trim();

  // Check for duplicate email
  const existing = await db.prepare('SELECT id FROM users WHERE email = ?').bind(email).first<{ id: number }>();
  if (existing) {
    return { success: false, error: 'EMAIL_EXISTS', message: '该邮箱已被注册' };
  }

  // Check if registration is enabled
  const config = await db.prepare("SELECT value FROM system_config WHERE key = 'register_enabled'").first<{ value: string }>();
  if (config && config.value === 'false') {
    return { success: false, error: 'REGISTRATION_DISABLED', message: '注册功能已关闭' };
  }

  const passwordHash = await hashPassword(input.password);
  const uuid = generateUUID();
  const now = Math.floor(Date.now() / 1000);
  const token = await generateToken(uuid, now);

  const result = await db.prepare(
    `INSERT INTO users (email, password, uuid, token, is_admin, banned, created_at, updated_at)
     VALUES (?, ?, ?, ?, 0, 0, ?, ?)`
  ).bind(email, passwordHash, uuid, token, now, now).run();

  if (!result.success) {
    return { success: false, error: 'DB_ERROR', message: '注册失败，请重试' };
  }

  // Get the new user's id
  const newUser = await db.prepare('SELECT id FROM users WHERE email = ?').bind(email).first<{ id: number }>();
  const userId = newUser!.id;

  const jwtSecret = env.JWT_SECRET || await getJwtSecret(db);
  const jwt = await createToken(
    { sub: userId, email, is_admin: 0 },
    jwtSecret
  );

  return {
    success: true,
    data: {
      token: jwt,
      user: { id: userId, email, uuid, token }
    }
  };
}

export async function loginUser(env: { DB: D1Database; JWT_SECRET: string; KV?: KVNamespace }, input: LoginInput) {
  const db = env.DB;
  const email = input.email.toLowerCase().trim();

  const user = await db.prepare(
    'SELECT id, email, password, uuid, token, is_admin, banned FROM users WHERE email = ?'
  ).bind(email).first<{
    id: number; email: string; password: string; uuid: string;
    token: string; is_admin: number; banned: number;
  }>();

  if (!user) {
    return { success: false, error: 'INVALID_CREDENTIALS', message: '邮箱或密码错误' };
  }

  if (user.banned === 1) {
    return { success: false, error: 'BANNED', message: '账号已被封禁' };
  }

  const valid = await verifyPassword(input.password, user.password);
  if (!valid) {
    return { success: false, error: 'INVALID_CREDENTIALS', message: '邮箱或密码错误' };
  }

  // Update last login
  const now = Math.floor(Date.now() / 1000);
  await db.prepare(
    'UPDATE users SET last_login_at = ?, updated_at = ? WHERE id = ?'
  ).bind(now, now, user.id).run();

  const jwtSecret = env.JWT_SECRET || await getJwtSecret(db);
  const jwt = await createToken(
    { sub: user.id, email: user.email, is_admin: user.is_admin },
    jwtSecret
  );

  return {
    success: true,
    data: {
      token: jwt,
      user: {
        id: user.id,
        email: user.email,
        uuid: user.uuid,
        token: user.token,
        is_admin: user.is_admin,
      }
    }
  };
}

async function getJwtSecret(db: D1Database): Promise<string> {
  const config = await db.prepare("SELECT value FROM system_config WHERE key = 'jwt_secret'").first<{ value: string }>();
  if (config && config.value) return config.value;
  // Generate one on the fly
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const secret = btoa(String.fromCharCode(...bytes));
  const now = Math.floor(Date.now() / 1000);
  await db.prepare(
    "INSERT OR REPLACE INTO system_config (key, value, updated_at) VALUES ('jwt_secret', ?, ?)"
  ).bind(secret, now).run();
  return secret;
}
