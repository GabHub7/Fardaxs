-- ============================================================
-- 019_fix_casaku_env_vars.sql
-- Corrects payment_env_vars for Casaku.id against the actual official API
-- docs (previous migrations guessed at field names without a source).
--
-- What was wrong:
-- - CASAKU_MERCHANT_ID and CASAKU_SECRET_KEY don't exist in Casaku's API at
--   all. Auth is a single `x-license-key` header — no request signing.
-- - Migration 017 removed CASAKU_LICENSE_KEY assuming it was a duplicate of
--   the secret key. It is not — License Key is the one real credential.
--   017 was itself the mistake; this migration reverts it.
-- - CASAKU_API_URL held the base URL WITH a wrongly-appended /api suffix in
--   some deployments — every endpoint path already includes /api itself
--   (e.g. POST /api/generate/v2/qris), so the base URL must be bare
--   (https://api.casaku.id) with no suffix. Renamed to CASAKU_BASE_URL to
--   make that unambiguous.
-- - There was no field for the QRIS merchant profile ID (`qr_id` / `id` in
--   Casaku's request bodies) — added as CASAKU_QR_ID.
-- ============================================================

DELETE FROM payment_env_vars WHERE key IN ('CASAKU_MERCHANT_ID', 'CASAKU_SECRET_KEY');

UPDATE payment_env_vars
SET key = 'CASAKU_BASE_URL',
    description = 'Base URL API Casaku.id — https://api.casaku.id (JANGAN tambahkan /api, semua path endpoint sudah menyertakan /api sendiri)'
WHERE key = 'CASAKU_API_URL';

INSERT INTO payment_env_vars (provider_group, key, is_secret, description)
VALUES
  ('CASAKU', 'CASAKU_LICENSE_KEY', true, 'License Key Casaku.id — satu-satunya kredensial API, kirim di setiap request via header x-license-key. Ambil dari halaman API Keys di dashboard Casaku.id.'),
  ('CASAKU', 'CASAKU_QR_ID', false, 'ID QRIS Merchant (UUID) yang terdaftar di dashboard Casaku.id — dikirim sebagai qr_id/id di setiap request generate QRIS.')
ON CONFLICT (key) DO NOTHING;

UPDATE payment_env_vars
SET description = 'Secret untuk validasi signature webhook Casaku.id (header X-Casaku-Signature, HMAC-SHA256 atas raw body). Diambil dari halaman Webhook Developer di dashboard Casaku.id — TIDAK sama dengan License Key.'
WHERE key = 'CASAKU_WEBHOOK_SECRET';
