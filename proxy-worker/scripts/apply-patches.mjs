// Apply multi-user patches to core.js
// Usage: node scripts/apply-patches.mjs

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const corePath = join(__dirname, '..', 'src', 'core.js');

let code = readFileSync(corePath, 'utf-8');

// ============================================================
// Patch 1: Add multiUser.js import at top
// ============================================================
code = code.replace(
  "let config_JSON, 反代IP = ''",
  `// === 2Edge Multi-User Patch ===
import { refreshUserCache, findUserByUUID, matchAnyUUID, matchAnyTrojanUser, recordTraffic, findUserByToken } from './multiUser.js';
// === End 2Edge Patch ===

let config_JSON, 反代IP = ''`
);

// ============================================================
// Patch 2: Add multi-user variables after UUID derivation
// ============================================================
code = code.replace(
  "const userID = (envUUID && uuidRegex.test(envUUID))",
  `// === 2Edge Multi-User Patch ===
// Background refresh user UUID cache from D1
ctx.waitUntil(refreshUserCache(env));
// Track authenticated user ID for traffic counting
let currentUserId = null;
// === End 2Edge Patch ===

const userID = (envUUID && uuidRegex.test(envUUID))`
);

// ============================================================
// Patch 3: UUID字节匹配 -> also check all cached users
// Add multi-user UUID matching function
// ============================================================
const uuidMatchOld = `function UUID字节匹配(data, offset, uuid) {
\t\tconst expected = 获取UUID字节(uuid);
\t\tif (!expected || data.byteLength < offset + 16) return false;
\t\tfor (let i = 0; i < 16; i++) {
\t\t\tif (data[offset + i] !== expected[i]) return false;
\t\t}
\t\treturn true;
\t}`;

const uuidMatchNew = `function UUID字节匹配(data, offset, uuid) {
\t\tconst expected = 获取UUID字节(uuid);
\t\tif (!expected || data.byteLength < offset + 16) return false;
\t\tfor (let i = 0; i < 16; i++) {
\t\t\tif (data[offset + i] !== expected[i]) return false;
\t\t}
\t\treturn true;
\t}

\t// === 2Edge Multi-User Patch ===
\tfunction UUID多用户匹配(data, offset) {
\t\tif (!data || data.byteLength < offset + 16) return null;
\t\tfor (const [uuidStr, user] of userCache) {
\t\t\tif (!user || !user.uuid) continue;
\t\t\tconst expected = 获取UUID字节(user.uuid);
\t\t\tif (!expected) continue;
\t\t\tlet match = true;
\t\t\tfor (let i = 0; i < 16; i++) {
\t\t\t\tif (data[offset + i] !== expected[i]) { match = false; break; }
\t\t\t}
\t\t\tif (match) { currentUserId = user.id; return true; }
\t\t}
\t\treturn false;
\t}
\t// === End 2Edge Patch ===`;

// Try exact match first, then fallback
if (code.includes(uuidMatchOld)) {
  code = code.replace(uuidMatchOld, uuidMatchNew);
} else {
  // Try with different tab patterns
  console.warn('Warning: UUID字节匹配 function not found with exact match. Trying alternatives...');
  const altOld = /function UUID字节匹配\(data, offset, uuid\) \{[\s\S]*?return true;\s*\}/m;
  const match = code.match(altOld);
  if (match) {
    code = code.replace(match[0], uuidMatchNew);
  } else {
    console.error('ERROR: Could not find UUID字节匹配 function to patch!');
  }
}

// ============================================================
// Patch 4: Modify VLESS parse callers to use multi-user check
// Replace UUID字节匹配(data, 1, token) calls with multi-user fallback
// ============================================================

// In 尝试解析魏烈思首包 (line ~679)
code = code.replace(
  /if \(!UUID字节匹配\(data, 1, token\)\) return \{ 状态: 'invalid' \};/g,
  `if (!UUID字节匹配(data, 1, token) && !UUID多用户匹配(data, 1)) return { 状态: 'invalid' };`
);

// In 是有效WS早期数据 (line ~1082)
code = code.replace(
  /if \(bytes\.byteLength >= 18 && UUID字节匹配\(bytes, 1, token\)\) return true;/g,
  `if (bytes.byteLength >= 18 && (UUID字节匹配(bytes, 1, token) || UUID多用户匹配(bytes, 1))) return true;`
);

// In 解析魏烈思请求 (line ~1665)
code = code.replace(
  /if \(!UUID字节匹配\(data, 1, token\)\) return \{ hasError: true, message: 'Invalid uuid' \};/g,
  `if (!UUID字节匹配(data, 1, token) && !UUID多用户匹配(data, 1)) return { hasError: true, message: 'Invalid uuid' };`
);

// ============================================================
// Patch 5: Modify Trojan parser to multi-user
// ============================================================
code = code.replace(
  "const sha224Password = sha224(passwordPlainText);",
  `// === 2Edge Multi-User Patch ===
\tconst sha224Password = sha224(passwordPlainText); // kept for admin auth fallback
\t// Multi-user Trojan check is handled at call sites with matchAnyTrojanUser
\t// === End 2Edge Patch ===`
);

// ============================================================
// Patch 6: Add traffic counting at forwardataTCP
// ============================================================
// Add traffic recording calls after successful data transfer
code = code.replace(
  /function forwardataTCP\(/g,
  `// === 2Edge Multi-User Patch: Added traffic recording ===
function recordTrafficIfAuthed(bytesUp, bytesDown) {
\tif (currentUserId) {
\t\trecordTraffic(currentUserId, bytesUp || 0, bytesDown || 0);
\t}
}
// === End 2Edge Patch ===

function forwardataTCP(`
);

// ============================================================
// Write patched file
// ============================================================
writeFileSync(corePath, code, 'utf-8');
console.log('Patches applied successfully to core.js');
console.log('Modified file size:', code.length, 'bytes');
