-- 002_traffic: Traffic logging tables
CREATE TABLE IF NOT EXISTS traffic_hourly (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL,
    u           INTEGER NOT NULL DEFAULT 0,
    d           INTEGER NOT NULL DEFAULT 0,
    recorded_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_traffic_hourly_user ON traffic_hourly(user_id, recorded_at);

CREATE TABLE IF NOT EXISTS traffic_daily (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL,
    u           INTEGER NOT NULL DEFAULT 0,
    d           INTEGER NOT NULL DEFAULT 0,
    recorded_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_traffic_daily_user ON traffic_daily(user_id, recorded_at);
