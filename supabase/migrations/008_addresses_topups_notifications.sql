-- ============================================================
-- FARDAX STORE - ADDRESSES, WALLET TOP-UPS, NOTIFICATION PREFS
-- Version: 1.0
-- Completes the account-area features that previously shipped as
-- "coming soon" placeholders: saved addresses, real wallet top-ups
-- through the payment gateway, and persisted notification settings.
-- Also creates the `site_settings` table that the admin settings panel
-- already reads/writes but no earlier migration defined.
-- ============================================================

-- ============================================================
-- SITE SETTINGS (key/value store for storefront + admin config)
-- ============================================================

CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- Public, read-only catalog of storefront settings (CS contact, site name…).
DROP POLICY IF EXISTS "site_settings_public_read" ON site_settings;
CREATE POLICY "site_settings_public_read" ON site_settings
  FOR SELECT USING (TRUE);

-- Sensible defaults so the Bantuan/CS page has something to show out of the box.
INSERT INTO site_settings (key, value) VALUES
  ('site_name',      '"Fardax Store"'),
  ('support_email',  '"support@fardax.store"'),
  ('whatsapp_number','"6281234567890"')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- USER ADDRESSES
-- ============================================================

CREATE TABLE user_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,                 -- 'Rumah', 'Kantor', etc.
  recipient_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  full_address TEXT NOT NULL,
  city TEXT,
  postal_code TEXT,
  notes TEXT,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_addresses_user_id ON user_addresses(user_id);

CREATE TRIGGER trg_user_addresses_updated_at
  BEFORE UPDATE ON user_addresses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Guarantee at most one default address per user.
CREATE UNIQUE INDEX idx_user_addresses_one_default
  ON user_addresses(user_id) WHERE is_default;

ALTER TABLE user_addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_addresses_select_own" ON user_addresses
  FOR SELECT USING (user_id = get_user_id(auth.uid()) OR is_admin());
CREATE POLICY "user_addresses_insert_own" ON user_addresses
  FOR INSERT WITH CHECK (user_id = get_user_id(auth.uid()));
CREATE POLICY "user_addresses_update_own" ON user_addresses
  FOR UPDATE USING (user_id = get_user_id(auth.uid()));
CREATE POLICY "user_addresses_delete_own" ON user_addresses
  FOR DELETE USING (user_id = get_user_id(auth.uid()));

-- ============================================================
-- WALLET TOP-UPS (gateway-backed balance top-ups)
-- ============================================================

CREATE TABLE wallet_topups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  invoice_number TEXT NOT NULL UNIQUE,  -- always prefixed "TOPUP-" so the gateway webhook can route it
  amount NUMERIC(20, 2) NOT NULL CHECK (amount > 0),
  fee NUMERIC(20, 2) NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'QRIS',
  status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'PAID', 'FAILED', 'EXPIRED')),
  gateway_reference TEXT,
  payment_url TEXT,
  qr_url TEXT,
  payment_code TEXT,
  expired_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wallet_topups_user_id ON wallet_topups(user_id);
CREATE INDEX idx_wallet_topups_invoice_number ON wallet_topups(invoice_number);
CREATE INDEX idx_wallet_topups_status ON wallet_topups(status);

CREATE TRIGGER trg_wallet_topups_updated_at
  BEFORE UPDATE ON wallet_topups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE wallet_topups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wallet_topups_select_own" ON wallet_topups
  FOR SELECT USING (user_id = get_user_id(auth.uid()) OR is_admin());

-- ============================================================
-- NOTIFICATION PREFERENCES (per-user, persisted)
-- ============================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_prefs JSONB
  NOT NULL DEFAULT '{"order": true, "promo": false}'::jsonb;
