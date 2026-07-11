-- ============================================================
-- 020_okeconnect_proxy_env_vars.sql
-- Opsional: konfigurasi relay proxy ber-IP statis untuk OkeConnect.
--
-- Kenapa perlu — Vercel serverless function tidak punya outbound IP
-- tetap (IP-nya diambil random dari pool AWS tiap kali function
-- di-spin up), sedangkan OkeConnect mengunci akses H2H ke 1 IP tetap
-- lewat fitur "Transaksi via IP" di dashboard mereka. Kalau dua nilai
-- di bawah diisi, src/lib/providers/okeconnect.ts akan melempar semua
-- request lewat relay ber-IP statis (lihat folder okeconnect-relay/)
-- alih-alih menghubungi OkeConnect langsung dari Vercel.
--
-- Kosongkan kedua nilai ini kapan saja untuk kembali ke mode lama
-- (app manggil OkeConnect langsung, tanpa relay).
-- ============================================================

INSERT INTO payment_env_vars (provider_group, key, is_secret, description) VALUES
  ('OKECONNECT', 'OKECONNECT_PROXY_URL',    false, 'URL endpoint /forward dari relay proxy (kosongkan jika tidak pakai relay), contoh: https://relay-domain-anda.com/forward'),
  ('OKECONNECT', 'OKECONNECT_PROXY_SECRET', true,  'Harus sama persis dengan RELAY_SECRET di .env relay — lihat okeconnect-relay/README.md')
ON CONFLICT (key) DO NOTHING;
