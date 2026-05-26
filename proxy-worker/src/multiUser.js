// multiUser.js - Multi-user UUID cache and traffic batching for edgetunnel
// This module is imported by core.js to add multi-user support

// In-memory user cache: Map<uuid, { id, uuid, banned, transfer_enable, u, d }>
let userCache = new Map();
let userCacheTimestamp = 0;
const CACHE_TTL_MS = 30000; // Refresh every 30 seconds

// Pending traffic: Map<userId, { u, d }>
let pendingTraffic = new Map();
let trafficFlushTimer = null;
const FLUSH_INTERVAL_MS = 60000; // Flush to D1 every 60 seconds

/**
 * Refresh the in-memory user cache from D1
 * Called at the start of each request (non-blocking via ctx.waitUntil)
 */
export async function refreshUserCache(env) {
  const now = Date.now();
  if (now - userCacheTimestamp < CACHE_TTL_MS) return;

  try {
    const result = await env.DB.prepare(
      `SELECT id, uuid, banned, transfer_enable, u, d FROM users WHERE banned = 0`
    ).all();

    const newCache = new Map();
    if (result.results) {
      for (const row of result.results) {
        newCache.set(row.uuid.toLowerCase(), {
          id: row.id,
          uuid: row.uuid,
          banned: row.banned,
          transfer_enable: row.transfer_enable,
          u: row.u,
          d: row.d,
        });
      }
    }
    userCache = newCache;
    userCacheTimestamp = now;
  } catch (e) {
    console.error('[multiUser] Cache refresh failed:', e);
  }
}

/**
 * Find user by UUID string
 * @param {string} uuid
 * @returns {{ id: number, uuid: string } | null}
 */
export function findUserByUUID(uuid) {
  const key = uuid.toLowerCase();
  return userCache.get(key) || null;
}

/**
 * Check if any UUID in the cache matches the given 16-byte buffer
 * @param {Uint8Array} data - The protocol data buffer
 * @param {number} offset - Where the UUID starts
 * @returns {{ id: number, uuid: string } | null}
 */
export function matchAnyUUID(data, offset) {
  for (const [uuidStr, user] of userCache) {
    const uuidBytes = parseUUIDToBytes(uuidStr);
    let match = true;
    for (let i = 0; i < 16; i++) {
      if (data[offset + i] !== uuidBytes[i]) {
        match = false;
        break;
      }
    }
    if (match) return { id: user.id, uuid: uuidStr };
  }
  return null;
}

/**
 * Match any UUID's SHA-224 hash for Trojan protocol
 * @param {Uint8Array} data - First 56 bytes of Trojan request
 * @returns {{ id: number, uuid: string } | null}
 */
export async function matchAnyTrojanUser(data) {
  if (data.byteLength < 56) return null;

  for (const [uuidStr, user] of userCache) {
    const hash = await sha224(uuidStr);
    let match = true;
    for (let i = 0; i < 56; i++) {
      if (data[i] !== hash.charCodeAt(i)) {
        match = false;
        break;
      }
    }
    if (match) return { id: user.id, uuid: uuidStr };
  }
  return null;
}

/**
 * Record traffic for a user (accumulates in memory, flushed periodically)
 * @param {number} userId
 * @param {number} bytesUp - Upload bytes (client -> target)
 * @param {number} bytesDown - Download bytes (target -> client)
 */
export function recordTraffic(userId, bytesUp, bytesDown) {
  if (userId <= 0) return;
  const entry = pendingTraffic.get(userId) || { u: 0, d: 0 };
  entry.u += bytesUp || 0;
  entry.d += bytesDown || 0;
  pendingTraffic.set(userId, entry);
  scheduleTrafficFlush();
}

/**
 * Get proxy configuration (host, path, etc.) from system_config
 * @param {object} env - Worker environment
 * @returns {Promise<{ proxyHost: string, proxyPath: string, protocol: string }>}
 */
export async function getProxyConfig(env) {
  const host = env.PROXY_HOST || env.HOST || '';
  const path = env.PROXY_PATH || env.PATH || '/';
  return { proxyHost: host, proxyPath: path, protocol: 'https' };
}

// --- Internal helpers ---

function parseUUIDToBytes(uuidStr) {
  const hex = uuidStr.replace(/-/g, '');
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

async function sha224(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hash = await crypto.subtle.digest('SHA-224', data);
  return Array.from(new Uint8Array(hash), b => String.fromCharCode(b)).join('');
}

function scheduleTrafficFlush() {
  if (trafficFlushTimer) return;
  trafficFlushTimer = setTimeout(() => {
    flushTraffic().catch(e => console.error('[multiUser] Traffic flush error:', e));
  }, FLUSH_INTERVAL_MS);
}

async function flushTraffic(env) {
  if (pendingTraffic.size === 0) {
    trafficFlushTimer = null;
    return;
  }

  const entries = [...pendingTraffic.entries()];
  pendingTraffic.clear();
  trafficFlushTimer = null;

  if (!env || !env.DB) {
    // Re-queue entries if DB is not available
    for (const [userId, traffic] of entries) {
      const e = pendingTraffic.get(userId) || { u: 0, d: 0 };
      e.u += traffic.u;
      e.d += traffic.d;
      pendingTraffic.set(userId, e);
    }
    scheduleTrafficFlush();
    return;
  }

  const now = Math.floor(Date.now() / 1000);

  try {
    // Batch update user traffic counters
    const stmts = entries.map(([userId, traffic]) =>
      env.DB.prepare(
        'UPDATE users SET u = u + ?, d = d + ?, updated_at = ? WHERE id = ?'
      ).bind(traffic.u, traffic.d, now, userId)
    );

    await env.DB.batch(stmts);
  } catch (e) {
    console.error('[multiUser] Traffic flush DB error:', e);
    // Re-queue on failure
    for (const [userId, traffic] of entries) {
      const e = pendingTraffic.get(userId) || { u: 0, d: 0 };
      e.u += traffic.u;
      e.d += traffic.d;
      pendingTraffic.set(userId, e);
    }
    scheduleTrafficFlush();
  }
}

// Export flushTraffic so the main handler can pass env when flushing
export { flushTraffic };

/**
 * Find user by subscription token
 * @param {object} db - D1 database binding
 * @param {string} token
 * @returns {Promise<{ uuid: string, transfer_enable: number, u: number, d: number, expired_at: number | null, banned: number } | null>}
 */
export async function findUserByToken(db, token) {
  const result = await db.prepare(
    `SELECT uuid, transfer_enable, u, d, expired_at, banned
     FROM users WHERE token = ?`
  ).bind(token).first();
  return result;
}
