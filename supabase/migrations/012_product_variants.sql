-- ============================================================
-- PRODUCT VARIANTS
-- Allows a single product to have multiple selectable options
-- e.g. Canva Design / Member / Head at different price points
-- ============================================================

CREATE TABLE product_variants (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id            UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name                  TEXT NOT NULL,
  selling_price         NUMERIC(12,2) NOT NULL DEFAULT 0,
  reseller_price        NUMERIC(12,2) NOT NULL DEFAULT 0,
  base_cost             NUMERIC(12,2) NOT NULL DEFAULT 0,
  provider_product_code TEXT,
  sort_order            INTEGER NOT NULL DEFAULT 0,
  status                TEXT NOT NULL DEFAULT 'ACTIVE'
                          CHECK (status IN ('ACTIVE', 'INACTIVE')),
  metadata              JSONB NOT NULL DEFAULT '{}',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_product_variants_product_id ON product_variants(product_id);

CREATE TRIGGER update_product_variants_updated_at
  BEFORE UPDATE ON product_variants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Add variant reference to orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL;

-- ─── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;

-- Storefront: anyone can read active variants (for active products)
CREATE POLICY "Public read active variants"
  ON product_variants FOR SELECT
  USING (status = 'ACTIVE');

-- Admins: full access via service role (bypasses RLS)
-- Service role is used for all admin writes, so no extra policy needed.
