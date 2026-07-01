-- ============================================================
-- 017_remove_casaku_license_key.sql
-- Casaku.id only issues a single API key per merchant (the "secret key"),
-- despite the API also calling it a "license key" in its docs. The app
-- used to treat CASAKU_SECRET_KEY and CASAKU_LICENSE_KEY as two separate
-- required credentials, so the admin panel asked for a second value that
-- doesn't exist, which made every request fail with a credential error.
-- CASAKU_SECRET_KEY is now sent as both the signing key and the
-- x-license-key header value — drop the now-unused row.
-- ============================================================

DELETE FROM payment_env_vars WHERE key = 'CASAKU_LICENSE_KEY';
