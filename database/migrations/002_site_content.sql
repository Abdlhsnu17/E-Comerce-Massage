CREATE TABLE IF NOT EXISTS site_content (
  id INT UNSIGNED NOT NULL, services_title VARCHAR(255) NOT NULL, services_intro TEXT NULL,
  about_label VARCHAR(120) NOT NULL, about_title VARCHAR(255) NOT NULL, about_text TEXT NOT NULL,
  about_image VARCHAR(255) NULL, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO site_content
  (id, services_title, services_intro, about_label, about_title, about_text, about_image)
VALUES
  (1,
   'Waktu istimewa untuk si kecil dan keluarga.',
   'Setiap sesi dilakukan dengan tempo lembut dan komunikasi yang baik bersama orang tua.',
   'Tentang Sentuhan Kecil',
   'Ruang yang mengutamakan rasa nyaman.',
   'Kami percaya pengalaman pijat bayi yang baik dimulai dengan mendengarkan orang tua dan memperhatikan respons bayi. Tidak ada sesi yang dipaksakan; kenyamanan si kecil selalu menjadi prioritas.',
   NULL)
ON DUPLICATE KEY UPDATE id = id;
