-- Updates the default website label for existing installations.
UPDATE site_content
SET about_label = 'Tentang Aera Baby Spa'
WHERE content_key = 'homepage'
  AND about_label = 'Tentang Sentuhan Kecil';
