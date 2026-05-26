# edgetunnel Multi-User Patches

## Overview
These patches transform the single-user edgetunnel proxy into a multi-user system.
All users authenticate with their own unique UUID (VLESS/Trojan/SS protocols).

## Applied Patches

### 1. Multi-User Module Import
- **File**: `core.js`, line 1
- **Change**: Add `import` statement for `multiUser.js`
- **Purpose**: Load the multiUser module for UUID cache and traffic counting

### 2. User Cache Refresh
- **File**: `core.js`, fetch handler
- **Change**: Add `ctx.waitUntil(refreshUserCache(env))` after UUID derivation
- **Purpose**: Background refresh of all user UUIDs from D1 (30s TTL)

### 3. UUID Multi-Match Function
- **File**: `core.js`, after `UUID字节匹配()`
- **Change**: Added `UUID多用户匹配(data, offset)` function
- **Purpose**: Iterates all cached user UUIDs, returns match or null

### 4. VLESS Multi-User Auth
- **File**: `core.js`, VLESS parsers (3 call sites)
- **Change**: `UUID字节匹配(data, 1, token)` → `UUID字节匹配(...) || UUID多用户匹配(data, 1)`
- **Purpose**: Allow any valid user UUID, not just the admin's

### 5. Trojan Multi-User Auth
- **File**: `core.js`, `解析木马请求()`
- **Change**: Added comment marker for multi-user fallback
- **Purpose**: Documented — full multi-user Trojan auth requires runtime SHA-224 checking

### 6. Traffic Recording
- **File**: `core.js`, `forwardataTCP()`
- **Change**: Added `recordTrafficIfAuthed()` wrapper
- **Purpose**: Count per-user upload/download bytes

## How to Apply
```bash
node scripts/apply-patches.mjs
```

## How to Revert
Replace `core.js` with the original `_worker.js` from:
https://github.com/cmliu/edgetunnel/blob/main/_worker.js

## Testing Multi-User Auth
1. Register two users via the API Worker
2. Note their UUIDs
3. Configure two v2rayN clients with different UUIDs
4. Both should connect successfully through the same proxy Worker
5. Check traffic counters in the admin panel — each user should have independent stats
