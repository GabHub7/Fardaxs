-- ============================================================
-- 007 — SMM Panel support + fulfillment/target type reconciliation
-- ============================================================
--
-- The application (admin product form + API) uses fulfillment type
-- 'AUTO_PPOB', which the original 001 CHECK constraint did not allow,
-- and now also needs 'SMM' for social-media (followers/likes/views)
-- services fulfilled via an SMM panel. This migration widens both the
-- fulfillment_type and target_type CHECK constraints so those values
-- are accepted. Idempotent: safe to re-run.

ALTER TABLE products DROP CONSTRAINT IF EXISTS products_fulfillment_type_check;
ALTER TABLE products ADD CONSTRAINT products_fulfillment_type_check
  CHECK (fulfillment_type IN ('PROVIDER', 'AUTO_PPOB', 'SMM', 'INVENTORY', 'MANUAL', 'SEMI_AUTO'));

ALTER TABLE products DROP CONSTRAINT IF EXISTS products_target_type_check;
ALTER TABLE products ADD CONSTRAINT products_target_type_check
  CHECK (target_type IN ('PHONE', 'EMAIL', 'USERNAME', 'GAME_ID', 'URL', 'ACCOUNT_ID', 'CUSTOM'));
