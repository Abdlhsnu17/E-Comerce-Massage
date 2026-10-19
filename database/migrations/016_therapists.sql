CREATE TABLE therapists (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  phone VARCHAR(30) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_therapists_active (is_active, name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO therapists (name, is_active)
SELECT 'Terapis Utama', 1
WHERE NOT EXISTS (SELECT 1 FROM therapists);

ALTER TABLE orders
  ADD COLUMN therapist_id INT UNSIGNED NULL AFTER service_duration_minutes,
  ADD KEY idx_orders_therapist_appointment (therapist_id, appointment_date, appointment_time),
  ADD CONSTRAINT fk_orders_therapist FOREIGN KEY (therapist_id)
    REFERENCES therapists(id) ON UPDATE CASCADE ON DELETE SET NULL;

UPDATE orders
SET therapist_id = (SELECT id FROM therapists ORDER BY id LIMIT 1)
WHERE therapist_id IS NULL;
