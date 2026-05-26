-- 003_seed: Default system config
INSERT OR IGNORE INTO system_config (key, value, updated_at) VALUES
    ('site_name', '2Edge', CAST((julianday('now') - 2440587.5) * 86400 AS INTEGER)),
    ('register_enabled', 'true', CAST((julianday('now') - 2440587.5) * 86400 AS INTEGER)),
    ('default_traffic_gb', '1', CAST((julianday('now') - 2440587.5) * 86400 AS INTEGER)),
    ('jwt_secret', '', CAST((julianday('now') - 2440587.5) * 86400 AS INTEGER));
