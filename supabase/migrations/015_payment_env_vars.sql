-- ============================================================
-- 015_payment_env_vars.sql
-- Admin-editable environment variables for payment gateways
-- (Casaku, OkeConnect, etc). Values are stored ENCRYPTED
-- (AES-256-GCM via src/lib/encryption.ts) and are the source
-- of truth the app reads at runtime through src/lib/env-vars.ts
-- — process.env is kept only as a cold-start fallback until the
-- admin panel saves its first value, and as the value Vercel
-- itself reports back to (best-effort sync, see lib/vercel-sync.ts).
-- ============================================================

CREATE TABLE payment_env_vars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_group TEXT NOT NULL,      -- e.g. 'CASAKU', 'OKECONNECT'
  key TEXT NOT NULL UNIQUE,          -- e.g. 'CASAKU_API_URL'
  value_encrypted TEXT,              -- AES-256-GCM ciphertext, NULL = unset
  is_secret BOOLEAN NOT NULL DEFAULT true,
  description TEXT,
  vercel_synced_at TIMESTAMPTZ,      -- last time this value was pushed to Vercel
  vercel_sync_error TEXT,            -- last sync error, if any (cleared on success)
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payment_env_vars_provider_group ON payment_env_vars(provider_group);

CREATE TRIGGER trg_payment_env_vars_updated_at
  BEFORE UPDATE ON payment_env_vars
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Seed the known keys with NULL values so the admin panel always has a
-- consistent set of rows to render, even before anything is configured.
INSERT INTO payment_env_vars (provider_group, key, is_secret, description) VALUES
  ('CASAKU',     'CASAKU_API_URL',        false, 'Base URL API Casaku.id — https://api.casaku.id'),
  ('CASAKU',     'CASAKU_LICENSE_KEY',    true,  'License key Casaku.id — wajib di setiap request, ambil dari halaman API Keys di dashboard'),
  ('CASAKU',     'CASAKU_MERCHANT_ID',    true,  'Merchant ID Casaku.id'),
  ('CASAKU',     'CASAKU_SECRET_KEY',     true,  'Secret key untuk signing request Casaku.id'),
  ('CASAKU',     'CASAKU_WEBHOOK_SECRET', true,  'Secret untuk validasi webhook Casaku.id (kosongkan untuk pakai SECRET_KEY)'),
  ('OKECONNECT', 'OKECONNECT_API_URL',     false, 'Base URL H2H OkeConnect (default: https://h2h.okeconnect.com)'),
  ('OKECONNECT', 'OKECONNECT_MEMBER_ID',   true,  'Member ID akun OkeConnect'),
  ('OKECONNECT', 'OKECONNECT_PIN',         true,  'PIN transaksi OkeConnect'),
  ('OKECONNECT', 'OKECONNECT_PASSWORD',    true,  'Password akun OkeConnect')
ON CONFLICT (key) DO NOTHING;

-- RLS: only service role touches this table directly (admin API routes use
-- createServiceClient(), same pattern as providers/site_settings).
ALTER TABLE payment_env_vars ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access_payment_env_vars"
  ON payment_env_vars
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ------------------------------------------------------------
-- Cashify → Casaku.id rename. Migration 001 set payments.gateway's
-- default to 'cashify' — update the default (and any existing rows still
-- carrying the old name) so new code consistently writes/reads 'casaku'.
-- ------------------------------------------------------------
ALTER TABLE payments ALTER COLUMN gateway SET DEFAULT 'casaku';
UPDATE payments SET gateway = 'casaku' WHERE gateway = 'cashify';
UPDATE payment_callbacks SET gateway = 'casaku' WHERE gateway = 'cashify';
