-- Optional tables for async notifications (safe to apply in production).
-- If you don't create these tables, the app will skip notifications even when enabled.

CREATE TABLE IF NOT EXISTS notification_queue (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  channel VARCHAR(20) NOT NULL,      -- whatsapp | telegram
  provider VARCHAR(20) NOT NULL,     -- meta | mas | telegram
  targetType VARCHAR(20) NOT NULL,   -- personal | group
  target VARCHAR(255) NOT NULL,      -- mobile number or chat id or group invite code
  message MEDIUMTEXT NOT NULL,
  meta JSON NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending | sent | failed
  attempts INT NOT NULL DEFAULT 0,
  lastError TEXT NULL,
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL,
  PRIMARY KEY (id),
  KEY idx_queue_status_created (status, createdAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS notification_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  eventType VARCHAR(50) NOT NULL,
  channel VARCHAR(20) NOT NULL,
  provider VARCHAR(20) NOT NULL,
  target VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL, -- enqueued | sent | failed | skipped
  error TEXT NULL,
  createdAt DATETIME NOT NULL,
  PRIMARY KEY (id),
  KEY idx_logs_created (createdAt),
  KEY idx_logs_event (eventType)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

