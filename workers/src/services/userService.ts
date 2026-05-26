import { generateUUID, generateToken } from '../utils/uuid';
import { hashPassword, verifyPassword } from '../utils/crypto';

export async function getUserProfile(db: D1Database, userId: number) {
  return db.prepare(
    `SELECT id, email, uuid, token, is_admin, banned,
            transfer_enable, u, d, speed_limit, expired_at,
            last_login_at, created_at
     FROM users WHERE id = ?`
  ).bind(userId).first();
}

export async function changePassword(db: D1Database, userId: number, oldPassword: string, newPassword: string) {
  const user = await db.prepare('SELECT password FROM users WHERE id = ?').bind(userId).first<{ password: string }>();
  if (!user) return { success: false, error: 'USER_NOT_FOUND', message: '用户不存在' };

  const valid = await verifyPassword(oldPassword, user.password);
  if (!valid) return { success: false, error: 'INVALID_PASSWORD', message: '原密码错误' };

  const newHash = await hashPassword(newPassword);
  const now = Math.floor(Date.now() / 1000);
  await db.prepare('UPDATE users SET password = ?, updated_at = ? WHERE id = ?').bind(newHash, now, userId).run();

  return { success: true, message: '密码修改成功' };
}

export async function resetUserUUID(db: D1Database, userId: number) {
  const newUUID = generateUUID();
  const now = Math.floor(Date.now() / 1000);
  await db.prepare('UPDATE users SET uuid = ?, updated_at = ? WHERE id = ?').bind(newUUID, now, userId).run();
  return { success: true, data: { uuid: newUUID } };
}

export async function resetUserToken(db: D1Database, userId: number) {
  const uuid = generateUUID();
  const now = Math.floor(Date.now() / 1000);
  const token = await generateToken(uuid, now);
  await db.prepare('UPDATE users SET token = ?, updated_at = ? WHERE id = ?').bind(token, now, userId).run();
  return { success: true, data: { token } };
}

export async function getUserTraffic(db: D1Database, userId: number, days: number = 30) {
  const now = Math.floor(Date.now() / 1000);
  const dayStart = now - days * 86400;

  const daily = await db.prepare(
    `SELECT u, d, recorded_at FROM traffic_daily
     WHERE user_id = ? AND recorded_at >= ?
     ORDER BY recorded_at ASC`
  ).bind(userId, dayStart).all<{ u: number; d: number; recorded_at: number }>();

  const hourly = await db.prepare(
    `SELECT u, d, recorded_at FROM traffic_hourly
     WHERE user_id = ? AND recorded_at >= ?
     ORDER BY recorded_at ASC LIMIT 168`
  ).bind(userId, now - 7 * 86400).all<{ u: number; d: number; recorded_at: number }>();

  return {
    daily: daily.results,
    hourly: hourly.results,
    summary: {
      total_upload: daily.results.reduce((s: number, r: { u: number }) => s + r.u, 0),
      total_download: daily.results.reduce((s: number, r: { d: number }) => s + r.d, 0),
    }
  };
}

export async function getAdminUserList(db: D1Database, params: {
  page: number;
  per_page: number;
  search?: string;
  status?: string;
  sort_by?: string;
  sort_order?: string;
}) {
  const { page, per_page, search, status, sort_by = 'id', sort_order = 'DESC' } = params;
  const offset = (page - 1) * per_page;

  const allowedSortCols = ['id', 'email', 'created_at', 'expired_at', 'u', 'd', 'transfer_enable'];
  const sortCol = allowedSortCols.includes(sort_by) ? sort_by : 'id';
  const sortDir = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  let where = '1=1';
  const bindings: unknown[] = [];

  if (search) {
    where += ' AND email LIKE ?';
    bindings.push(`%${search}%`);
  }
  if (status === 'banned') {
    where += ' AND banned = 1';
  } else if (status === 'active') {
    where += ' AND banned = 0';
  } else if (status === 'admin') {
    where += ' AND is_admin = 1';
  }

  const countResult = await db.prepare(`SELECT COUNT(*) as total FROM users WHERE ${where}`)
    .bind(...bindings).first<{ total: number }>();
  const total = countResult?.total || 0;

  const users = await db.prepare(
    `SELECT id, email, uuid, is_admin, banned, transfer_enable, u, d,
            speed_limit, expired_at, last_login_at, created_at
     FROM users WHERE ${where}
     ORDER BY ${sortCol} ${sortDir}
     LIMIT ? OFFSET ?`
  ).bind(...bindings, per_page, offset).all();

  return {
    data: users.results,
    meta: {
      current_page: page,
      per_page,
      total,
      last_page: Math.ceil(total / per_page),
    }
  };
}

export async function createUserByAdmin(db: D1Database, input: { email: string; password: string }) {
  const email = input.email.toLowerCase().trim();
  const existing = await db.prepare('SELECT id FROM users WHERE email = ?').bind(email).first<{ id: number }>();
  if (existing) return { success: false, error: 'EMAIL_EXISTS', message: '该邮箱已被注册' };

  const passwordHash = await hashPassword(input.password);
  const uuid = generateUUID();
  const now = Math.floor(Date.now() / 1000);
  const token = await generateToken(uuid, now);

  await db.prepare(
    `INSERT INTO users (email, password, uuid, token, is_admin, banned, created_at, updated_at)
     VALUES (?, ?, ?, ?, 0, 0, ?, ?)`
  ).bind(email, passwordHash, uuid, token, now, now).run();

  const newUser = await db.prepare('SELECT id FROM users WHERE email = ?').bind(email).first<{ id: number }>();
  return { success: true, data: { id: newUser!.id, email, uuid } };
}

export async function updateUserByAdmin(db: D1Database, userId: number, updates: Record<string, unknown>) {
  const allowedFields = ['email', 'password', 'transfer_enable', 'speed_limit', 'expired_at', 'remarks'];
  const setClauses: string[] = [];
  const bindings: unknown[] = [];

  for (const [key, value] of Object.entries(updates)) {
    if (allowedFields.includes(key) && value !== undefined) {
      if (key === 'password' && typeof value === 'string' && value.length > 0) {
        setClauses.push('password = ?');
        bindings.push(await hashPassword(value));
      } else {
        setClauses.push(`${key} = ?`);
        bindings.push(value);
      }
    }
  }

  if (setClauses.length === 0) return { success: false, error: 'NO_CHANGES', message: '没有需要更新的字段' };

  const now = Math.floor(Date.now() / 1000);
  setClauses.push('updated_at = ?');
  bindings.push(now);
  bindings.push(userId);

  await db.prepare(`UPDATE users SET ${setClauses.join(', ')} WHERE id = ?`).bind(...bindings).run();
  return { success: true, message: '用户信息已更新' };
}

export async function banUser(db: D1Database, userId: number) {
  const user = await db.prepare('SELECT banned FROM users WHERE id = ?').bind(userId).first<{ banned: number }>();
  if (!user) return { success: false, error: 'NOT_FOUND', message: '用户不存在' };

  const newStatus = user.banned === 1 ? 0 : 1;
  const now = Math.floor(Date.now() / 1000);
  await db.prepare('UPDATE users SET banned = ?, updated_at = ? WHERE id = ?').bind(newStatus, now, userId).run();
  return { success: true, data: { banned: newStatus } };
}

export async function deleteUser(db: D1Database, userId: number) {
  // Don't allow deleting the last admin
  const user = await db.prepare('SELECT is_admin FROM users WHERE id = ?').bind(userId).first<{ is_admin: number }>();
  if (!user) return { success: false, error: 'NOT_FOUND', message: '用户不存在' };

  if (user.is_admin === 1) {
    const adminCount = await db.prepare('SELECT COUNT(*) as count FROM users WHERE is_admin = 1').first<{ count: number }>();
    if (adminCount && adminCount.count <= 1) {
      return { success: false, error: 'LAST_ADMIN', message: '不能删除最后一个管理员' };
    }
  }

  await db.batch([
    db.prepare('DELETE FROM traffic_hourly WHERE user_id = ?').bind(userId),
    db.prepare('DELETE FROM traffic_daily WHERE user_id = ?').bind(userId),
    db.prepare('DELETE FROM users WHERE id = ?').bind(userId),
  ]);

  return { success: true, message: '用户已删除' };
}
