-- Membatalkan seluruh sesi lama setelah password diganti atau di-reset.
ALTER TABLE users
  ADD COLUMN session_version INT UNSIGNED NOT NULL DEFAULT 0 AFTER role;
