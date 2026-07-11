-- ============================================================
-- 010_seed_ppob_products.sql
-- Sample PPOB products so the PPOB service tiles aren't empty.
--
-- Each product is tagged with metadata->>'ppob_service' matching the slug
-- used by the PPOB grid (src/app/(store)/ppob/page.tsx), and carries the
-- target_* fields the order form needs (phone number, meter id, etc).
--
-- Idempotent: ON CONFLICT (slug) DO NOTHING.
-- ============================================================

WITH ppob AS (
  SELECT id FROM categories WHERE slug = 'ppob' LIMIT 1
)
INSERT INTO products (
  category_id, name, slug, short_description, image_url,
  base_cost, selling_price, reseller_price, fulfillment_type,
  target_type, target_label, target_placeholder,
  status, sort_order, metadata
)
SELECT
  ppob.id, v.name, v.slug, v.short_description, v.image_url,
  v.base_cost, v.selling_price, v.reseller_price, 'PROVIDER',
  v.target_type, v.target_label, v.target_placeholder,
  'ACTIVE', v.sort_order,
  jsonb_build_object('ppob_service', v.service)
FROM ppob, (VALUES
  -- ── Pulsa (PHONE) ───────────────────────────────────────────
  ('pulsa', 'Pulsa 5.000',   'pulsa-5k',   'Semua operator', 'logo:pulsa',   5800,   6500,   6200, 'PHONE', 'Nomor HP', 'Contoh: 081234567890', 1),
  ('pulsa', 'Pulsa 10.000',  'pulsa-10k',  'Semua operator', 'logo:pulsa',  10800,  11500,  11200, 'PHONE', 'Nomor HP', 'Contoh: 081234567890', 2),
  ('pulsa', 'Pulsa 25.000',  'pulsa-25k',  'Semua operator', 'logo:pulsa',  25000,  26000,  25500, 'PHONE', 'Nomor HP', 'Contoh: 081234567890', 3),
  ('pulsa', 'Pulsa 50.000',  'pulsa-50k',  'Semua operator', 'logo:pulsa',  49000,  50500,  49800, 'PHONE', 'Nomor HP', 'Contoh: 081234567890', 4),
  ('pulsa', 'Pulsa 100.000', 'pulsa-100k', 'Semua operator', 'logo:pulsa',  97500, 100000,  98800, 'PHONE', 'Nomor HP', 'Contoh: 081234567890', 5),

  -- ── Paket Data (PHONE) ──────────────────────────────────────
  ('paket-data', 'Paket Data 1GB / 30 Hari',  'data-1gb',  'Kuota utama 1GB',  'logo:data', 12000, 14000, 13000, 'PHONE', 'Nomor HP', 'Contoh: 081234567890', 1),
  ('paket-data', 'Paket Data 3GB / 30 Hari',  'data-3gb',  'Kuota utama 3GB',  'logo:data', 24000, 27000, 25500, 'PHONE', 'Nomor HP', 'Contoh: 081234567890', 2),
  ('paket-data', 'Paket Data 8GB / 30 Hari',  'data-8gb',  'Kuota utama 8GB',  'logo:data', 48000, 53000, 50500, 'PHONE', 'Nomor HP', 'Contoh: 081234567890', 3),

  -- ── PLN Token (CUSTOM — meter id) ───────────────────────────
  ('pln-token', 'Token PLN 20.000',  'pln-20k',  'Token listrik prabayar', 'logo:pln',  20000, 21500, 20800, 'CUSTOM', 'No. Meter / ID Pelanggan', 'Contoh: 14209876543', 1),
  ('pln-token', 'Token PLN 50.000',  'pln-50k',  'Token listrik prabayar', 'logo:pln',  50000, 51500, 50800, 'CUSTOM', 'No. Meter / ID Pelanggan', 'Contoh: 14209876543', 2),
  ('pln-token', 'Token PLN 100.000', 'pln-100k', 'Token listrik prabayar', 'logo:pln', 100000, 101500, 100800, 'CUSTOM', 'No. Meter / ID Pelanggan', 'Contoh: 14209876543', 3),
  ('pln-token', 'Token PLN 200.000', 'pln-200k', 'Token listrik prabayar', 'logo:pln', 200000, 201500, 200800, 'CUSTOM', 'No. Meter / ID Pelanggan', 'Contoh: 14209876543', 4),

  -- ── e-Wallet (PHONE) ────────────────────────────────────────
  ('e-wallet', 'Saldo DANA 25.000',  'ewallet-dana-25k',  'Top up DANA',  'logo:dana',  25500, 27000, 26000, 'PHONE', 'Nomor DANA',  'Contoh: 081234567890', 1),
  ('e-wallet', 'Saldo OVO 50.000',   'ewallet-ovo-50k',   'Top up OVO',   'logo:ovo',   50500, 52500, 51200, 'PHONE', 'Nomor OVO',   'Contoh: 081234567890', 2),
  ('e-wallet', 'Saldo GoPay 100.000','ewallet-gopay-100k','Top up GoPay', 'logo:gopay',101000,103500,102000, 'PHONE', 'Nomor GoPay', 'Contoh: 081234567890', 3),

  -- ── Voucher Game (ACCOUNT_ID) ───────────────────────────────
  ('voucher-game', 'Mobile Legends 86 Diamonds', 'game-ml-86',  'Top up Mobile Legends', 'logo:ml',  22000, 24000, 23000, 'ACCOUNT_ID', 'User ID (Zone ID)', 'Contoh: 12345678 (1234)', 1),
  ('voucher-game', 'Free Fire 100 Diamonds',     'game-ff-100', 'Top up Free Fire',      'logo:ff',  14000, 16000, 15000, 'ACCOUNT_ID', 'User ID',           'Contoh: 123456789', 2),

  -- ── BPJS (CUSTOM) ───────────────────────────────────────────
  ('bpjs', 'BPJS Kesehatan', 'bpjs-kesehatan', 'Iuran 1 bulan', 'logo:bpjs', 0, 2500, 2000, 'CUSTOM', 'No. VA BPJS', 'Contoh: 0001234567890', 1),

  -- ── PDAM (CUSTOM) ───────────────────────────────────────────
  ('pdam', 'Tagihan PDAM', 'pdam-tagihan', 'Cek & bayar tagihan air', 'logo:pdam', 0, 2500, 2000, 'CUSTOM', 'No. Pelanggan PDAM', 'Contoh: 1234567', 1)
) AS v(service, name, slug, short_description, image_url, base_cost, selling_price, reseller_price, target_type, target_label, target_placeholder, sort_order)
ON CONFLICT (slug) DO NOTHING;
