CREATE TABLE admin_audit_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  actor_user_id INT UNSIGNED NOT NULL,
  action VARCHAR(160) NOT NULL,
  target_type VARCHAR(60) NOT NULL,
  target_id INT UNSIGNED NULL,
  metadata JSON NULL,
  ip_address VARCHAR(64) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_admin_audit_logs_created (created_at),
  KEY idx_admin_audit_logs_actor (actor_user_id, created_at),
  CONSTRAINT fk_admin_audit_logs_actor FOREIGN KEY (actor_user_id)
    REFERENCES users(id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
