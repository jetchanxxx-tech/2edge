-- 001_users: Core user and config tables
CREATE TABLE IF NOT EXISTS users (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    email           TEXT    NOT NULL UNIQUE,
    password        TEXT    NOT NULL,
    uuid            TEXT    NOT NULL UNIQUE,
    token           TEXT    NOT NULL UNIQUE,
    is_admin        INTEGER NOT NULL DEFAULT 0,
    banned          INTEGER NOT NULL DEFAULT 0,
    transfer_enable INTEGER NOT NULL DEFAULT 1073741824,
    u               INTEGER NOT NULL DEFAULT 0,
    d               INTEGER NOT NULL DEFAULT 0,
    speed_limit     INTEGER DEFAULT NULL,
    device_limit    INTEGER DEFAULT NULL,
    last_login_at   INTEGER DEFAULT NULL,
    last_login_ip   TEXT    DEFAULT NULL,
    expired_at      INTEGER DEFAULT NULL,
    remarks         TEXT    DEFAULT NULL,
    created_at      INTEGER NOT NULL,
    updated_at      INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_uuid ON users(uuid);
CREATE INDEX IF NOT EXISTS idx_users_token ON users(token);
CREATE INDEX IF NOT EXISTS idx_users_banned ON users(banned);
CREATE INDEX IF NOT EXISTS idx_users_is_admin ON users(is_admin);

CREATE TABLE IF NOT EXISTS system_config (
    key         TEXT PRIMARY KEY,
    value       TEXT NOT NULL,
    updated_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_audit_log (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_id    INTEGER NOT NULL,
    action      TEXT NOT NULL,
    target_type TEXT DEFAULT NULL,
    target_id   INTEGER DEFAULT NULL,
    details     TEXT DEFAULT NULL,
    ip          TEXT DEFAULT NULL,
    created_at  INTEGER NOT NULL,
    FOREIGN KEY (admin_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_admin ON admin_audit_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_created ON admin_audit_log(created_at);
