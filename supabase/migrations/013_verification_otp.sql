-- ============================================================
-- 013_verification_otp.sql
-- Custom OTP-based verification, replacing Supabase Auth's built-in
-- "confirm your email" link flow. Two reasons:
--   1. The built-in link is generated from the Supabase project's Site
--      URL setting, not NEXT_PUBLIC_APP_URL — easy to misconfigure and
--      breaks on every new deployment domain.
--   2. We want verification to be switchable between EMAIL and WA_OTP
--      (once the WhatsApp bot is wired up) without changing the auth
--      provider itself. A single OTP table + a site_settings toggle
--      lets both channels share the same verify/resend logic.
-- ============================================================

-- ============================================================
-- VERIFICATION METHOD TOGGLE (admin-controlled)
-- ============================================================

INSERT INTO site_settings (key, value) VALUES
  ('verification_method', '"EMAIL"')  -- 'EMAIL' | 'WA_OTP'
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- OTP CODES
-- ============================================================

CREATE TABLE IF NOT EXISTS verification_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel TEXT NOT NULL DEFAULT 'EMAIL' CHECK (channel IN ('EMAIL', 'WA_OTP')),
  code_hash TEXT NOT NULL,           -- sha256(code) — never store the raw code
  destination TEXT NOT NULL,         -- email address or phone number the code was sent to
  purpose TEXT NOT NULL DEFAULT 'REGISTER' CHECK (purpose IN ('REGISTER', 'LOGIN_2FA', 'RESET_PASSWORD')),
  attempts INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 5,
  consumed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_verification_otps_user_purpose ON verification_otps(user_id, purpose, consumed_at);

ALTER TABLE verification_otps ENABLE ROW LEVEL SECURITY;

-- No direct client access — all reads/writes go through API routes using
-- the service role (codes must never be exposed to the anon/session client).
CREATE POLICY "verification_otps_service_only" ON verification_otps
  FOR ALL USING (FALSE);
