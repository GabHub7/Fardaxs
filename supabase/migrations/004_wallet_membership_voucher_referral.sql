-- ============================================================
-- FARDAX STORE - WALLET, MEMBERSHIP, VOUCHER & REFERRAL
-- Version: 1.0
-- Adds the domains required by the mobile UI mockup (Beranda/Akun pages)
-- that the original schema didn't cover: a general-purpose wallet for
-- every user (not just resellers), membership tiers, vouchers, and a
-- referral program.
-- ============================================================

-- ============================================================
-- MEMBERSHIP TIERS
-- ============================================================

CREATE TABLE membership_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,           -- e.g. 'Bronze', 'Silver', 'Gold', 'Platinum'
  slug TEXT NOT NULL UNIQUE,
  min_spend NUMERIC(20, 2) NOT NULL DEFAULT 0, -- cumulative spend required to reach this tier
  cashback_percent NUMERIC(5, 2) NOT NULL DEFAULT 0,
  badge_color TEXT DEFAULT '#94A3B8',
  icon TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_membership_tiers_updated_at
  BEFORE UPDATE ON membership_tiers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE users ADD COLUMN membership_tier_id UUID REFERENCES membership_tiers(id);
CREATE INDEX idx_users_membership_tier_id ON users(membership_tier_id);

-- ============================================================
-- WALLET (general-purpose balance for every user, not just resellers)
-- ============================================================

CREATE TABLE wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id),
  balance NUMERIC(20, 2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_wallets_updated_at
  BEFORE UPDATE ON wallets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE wallet_mutations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES wallets(id),
  user_id UUID NOT NULL REFERENCES users(id),
  type TEXT NOT NULL
    CHECK (type IN ('TOP_UP', 'PURCHASE', 'REFUND', 'BONUS', 'REFERRAL_COMMISSION', 'ADJUSTMENT')),
  amount NUMERIC(20, 2) NOT NULL, -- positive = credit, negative = debit
  before_balance NUMERIC(20, 2) NOT NULL,
  after_balance NUMERIC(20, 2) NOT NULL,
  reference_type TEXT, -- 'order', 'payment', 'referral', etc.
  reference_id TEXT,
  description TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wallet_mutations_wallet_id ON wallet_mutations(wallet_id);
CREATE INDEX idx_wallet_mutations_user_id ON wallet_mutations(user_id);
CREATE INDEX idx_wallet_mutations_created_at ON wallet_mutations(created_at);

-- Atomically apply a wallet mutation (mirrors how inventory/orders use
-- guarded UPDATEs elsewhere in the schema — avoids read-then-write races
-- between two concurrent top-ups/purchases for the same wallet).
CREATE OR REPLACE FUNCTION apply_wallet_mutation(
  p_user_id UUID,
  p_type TEXT,
  p_amount NUMERIC,
  p_reference_type TEXT DEFAULT NULL,
  p_reference_id TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_created_by UUID DEFAULT NULL
) RETURNS wallet_mutations AS $$
DECLARE
  v_wallet wallets;
  v_mutation wallet_mutations;
BEGIN
  -- Lock the wallet row for the duration of this transaction
  SELECT * INTO v_wallet FROM wallets WHERE user_id = p_user_id FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO wallets (user_id, balance) VALUES (p_user_id, 0)
    RETURNING * INTO v_wallet;
  END IF;

  IF v_wallet.balance + p_amount < 0 THEN
    RAISE EXCEPTION 'Saldo tidak mencukupi (saldo: %, diminta: %)', v_wallet.balance, -p_amount;
  END IF;

  UPDATE wallets
  SET balance = balance + p_amount
  WHERE id = v_wallet.id
  RETURNING * INTO v_wallet;

  INSERT INTO wallet_mutations (
    wallet_id, user_id, type, amount, before_balance, after_balance,
    reference_type, reference_id, description, created_by
  ) VALUES (
    v_wallet.id, p_user_id, p_type, p_amount,
    v_wallet.balance - p_amount, v_wallet.balance,
    p_reference_type, p_reference_id, p_description, p_created_by
  ) RETURNING * INTO v_mutation;

  RETURN v_mutation;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- VOUCHERS
-- ============================================================

CREATE TABLE vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('PERCENTAGE', 'FIXED')),
  discount_value NUMERIC(20, 2) NOT NULL,
  max_discount NUMERIC(20, 2), -- cap for PERCENTAGE vouchers
  min_purchase NUMERIC(20, 2) NOT NULL DEFAULT 0,
  usage_limit INTEGER, -- NULL = unlimited
  usage_count INTEGER NOT NULL DEFAULT 0,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'EXPIRED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vouchers_code ON vouchers(code);
CREATE INDEX idx_vouchers_status ON vouchers(status);

CREATE TRIGGER trg_vouchers_updated_at
  BEFORE UPDATE ON vouchers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Vouchers claimed by / assigned to a specific user
CREATE TABLE user_vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  voucher_id UUID NOT NULL REFERENCES vouchers(id),
  status TEXT NOT NULL DEFAULT 'AVAILABLE'
    CHECK (status IN ('AVAILABLE', 'USED', 'EXPIRED')),
  used_at TIMESTAMPTZ,
  used_on_order_id UUID REFERENCES orders(id),
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, voucher_id)
);

CREATE INDEX idx_user_vouchers_user_id ON user_vouchers(user_id);
CREATE INDEX idx_user_vouchers_status ON user_vouchers(status);

-- ============================================================
-- REFERRAL PROGRAM
-- ============================================================

CREATE TABLE referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id),
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_referral_codes_code ON referral_codes(code);

CREATE TABLE referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id UUID NOT NULL REFERENCES users(id),
  referred_user_id UUID NOT NULL UNIQUE REFERENCES users(id), -- one user can only be referred once
  referral_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'QUALIFIED', 'REWARDED')),
  -- 'QUALIFIED' once the referred user completes their first paid order;
  -- 'REWARDED' once commission has actually been credited to the wallet.
  commission_amount NUMERIC(20, 2) NOT NULL DEFAULT 0,
  qualified_at TIMESTAMPTZ,
  rewarded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_referrals_referrer_user_id ON referrals(referrer_user_id);
CREATE INDEX idx_referrals_referred_user_id ON referrals(referred_user_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_mutations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wallets_select_own" ON wallets
  FOR SELECT USING (user_id = get_user_id(auth.uid()) OR is_admin());

CREATE POLICY "wallet_mutations_select_own" ON wallet_mutations
  FOR SELECT USING (user_id = get_user_id(auth.uid()) OR is_admin());

CREATE POLICY "user_vouchers_select_own" ON user_vouchers
  FOR SELECT USING (user_id = get_user_id(auth.uid()) OR is_admin());

CREATE POLICY "referral_codes_select_own" ON referral_codes
  FOR SELECT USING (user_id = get_user_id(auth.uid()) OR is_admin());

CREATE POLICY "referrals_select_own" ON referrals
  FOR SELECT USING (
    referrer_user_id = get_user_id(auth.uid())
    OR referred_user_id = get_user_id(auth.uid())
    OR is_admin()
  );

-- Vouchers and membership_tiers are public reference data (read-only catalogs)
ALTER TABLE vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE membership_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vouchers_public_read" ON vouchers
  FOR SELECT USING (status = 'ACTIVE' OR is_admin());

CREATE POLICY "membership_tiers_public_read" ON membership_tiers
  FOR SELECT USING (TRUE);
