-- ============================================================
-- FARDAX STORE - SEED DATA
-- Version: 1.0
-- ============================================================

-- ============================================================
-- DEFAULT ROLES
-- ============================================================

INSERT INTO roles (id, name, description) VALUES
  ('00000000-0000-0000-0000-000000000001', 'MEMBER', 'Regular member'),
  ('00000000-0000-0000-0000-000000000002', 'RESELLER', 'Reseller with special pricing'),
  ('00000000-0000-0000-0000-000000000003', 'ADMIN', 'Store administrator'),
  ('00000000-0000-0000-0000-000000000004', 'SUPER_ADMIN', 'Super administrator with full access');

-- ============================================================
-- DEFAULT PERMISSIONS
-- ============================================================

INSERT INTO permissions (code, name) VALUES
  ('manage_orders', 'Manage Orders'),
  ('manage_products', 'Manage Products'),
  ('manage_categories', 'Manage Categories'),
  ('manage_users', 'Manage Users'),
  ('manage_providers', 'Manage Providers'),
  ('manage_settings', 'Manage Settings'),
  ('manage_inventory', 'Manage Inventory'),
  ('manage_payments', 'Manage Payments'),
  ('manage_cms', 'Manage CMS'),
  ('manage_analytics', 'View Analytics'),
  ('manage_notifications', 'Manage Notifications'),
  ('manage_resellers', 'Manage Resellers'),
  ('view_audit_logs', 'View Audit Logs'),
  ('manage_whatsapp', 'Manage WhatsApp Bot');

-- Admin permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000003', id FROM permissions;

-- Super admin permissions (same as admin — gets all via is_admin() function)
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000004', id FROM permissions;

-- ============================================================
-- DEFAULT CATEGORIES
-- ============================================================

INSERT INTO categories (name, slug, description, color, sort_order) VALUES
  ('PPOB', 'ppob', 'Pembayaran Tagihan & Top Up', '#3b82f6', 1),
  ('Streaming', 'streaming', 'Netflix, Spotify, Disney+, YouTube Premium', '#ef4444', 2),
  ('Design', 'design', 'Canva, Adobe, Figma', '#8b5cf6', 3),
  ('Cloud', 'cloud', 'Google One, iCloud, OneDrive', '#06b6d4', 4),
  ('AI Tools', 'ai-tools', 'ChatGPT, Midjourney, Copilot', '#f59e0b', 5),
  ('Game', 'game', 'Mobile Legends, PUBG, Free Fire', '#10b981', 6),
  ('Social Media', 'social-media', 'Followers, Likes, Views', '#ec4899', 7),
  ('E-Wallet', 'e-wallet', 'GoPay, OVO, Dana, ShopeePay', '#22c55e', 8);

-- ============================================================
-- DEFAULT PROVIDERS
-- ============================================================

INSERT INTO providers (name, slug, api_url, status, priority) VALUES
  ('OkeConnect', 'okeconnect', 'https://api.okeconnect.com/v1', 'ACTIVE', 1),
  ('Manual Inventory', 'manual', NULL, 'ACTIVE', 99);

-- ============================================================
-- DEFAULT APP SETTINGS
-- ============================================================

INSERT INTO app_settings (key, value, category, description) VALUES
  ('store_name', 'Fardax Store', 'general', 'Store display name'),
  ('store_description', 'Toko Digital Terpercaya', 'general', 'Store description'),
  ('store_email', 'support@fardaxstore.com', 'general', 'Support email'),
  ('store_phone', '+6281234567890', 'general', 'Support phone'),
  ('payment_expiry_minutes', '30', 'payment', 'Invoice expiry in minutes'),
  ('min_reseller_deposit', '10000', 'reseller', 'Minimum reseller deposit'),
  ('provider_low_balance_threshold', '100000', 'provider', 'Alert threshold for low balance'),
  ('inventory_low_stock_threshold', '5', 'inventory', 'Alert threshold for low inventory'),
  ('provider_retry_count', '3', 'provider', 'Max provider request retries'),
  ('provider_timeout_seconds', '30', 'provider', 'Provider request timeout'),
  ('whatsapp_notifications_enabled', 'false', 'notifications', 'Enable WhatsApp notifications'),
  ('email_notifications_enabled', 'true', 'notifications', 'Enable email notifications'),
  ('maintenance_mode', 'false', 'general', 'Enable maintenance mode'),
  ('cashback_percent', '0', 'promotions', 'Global cashback percentage');

-- ============================================================
-- DEFAULT BANNERS (placeholder - update with real images)
-- ============================================================

INSERT INTO banners (title, subtitle, image_url, link_url, button_text, sort_order, status) VALUES
  ('SPESIAL PROMO CASHBACK 20%', 'Untuk semua produk', '/images/banners/promo-cashback.webp', '/produk', 'Belanja Sekarang', 1, 'ACTIVE'),
  ('PPOB Hemat', 'Token PLN & Pulsa promo spesial', '/images/banners/ppob-promo.webp', '/ppob', 'Cek Promo', 2, 'ACTIVE'),
  ('Premium Apps Terbaik', 'Netflix, Spotify, Canva & lebih', '/images/banners/premium-apps.webp', '/kategori/streaming', 'Lihat Produk', 3, 'ACTIVE');

-- ============================================================
-- DEFAULT FAQs
-- ============================================================

INSERT INTO faqs (question, answer, sort_order) VALUES
  ('Bagaimana cara melakukan pembelian?', 'Pilih produk yang ingin dibeli, masukkan data yang diperlukan, pilih metode pembayaran, dan selesaikan pembayaran. Produk akan otomatis dikirimkan setelah pembayaran berhasil.', 1),
  ('Berapa lama proses pengiriman?', 'Untuk produk PPOB dan Social Media, pengiriman otomatis dalam hitungan detik hingga beberapa menit. Untuk Premium Apps melalui inventory, langsung setelah pembayaran berhasil.', 2),
  ('Metode pembayaran apa saja yang tersedia?', 'Kami menerima QRIS, Virtual Account (BCA, BNI, BRI, Mandiri), dan berbagai E-Wallet (GoPay, OVO, Dana, ShopeePay).', 3),
  ('Bagaimana jika pesanan saya gagal?', 'Jika pesanan gagal diproses, dana akan dikembalikan sepenuhnya ke saldo/metode pembayaran Anda dalam 1-3 hari kerja.', 4),
  ('Apakah bisa menjadi reseller?', 'Ya! Daftarkan akun Anda dan ajukan upgrade ke Reseller untuk mendapatkan harga khusus dan keuntungan lebih.', 5),
  ('Bagaimana cara menghubungi support?', 'Anda dapat menghubungi kami melalui WhatsApp, email, atau live chat yang tersedia di website kami 24/7.', 6);

-- ============================================================
-- DEFAULT TESTIMONIALS
-- ============================================================

INSERT INTO testimonials (customer_name, message, rating, sort_order) VALUES
  ('Ahmad R.', 'Transaksi sangat cepat! Token PLN langsung masuk dalam hitungan detik. Harga juga bersaing.', 5, 1),
  ('Siti M.', 'Beli Netflix Premium disini sudah 6 bulan, selalu lancar dan harga terjangkau. Recommended!', 5, 2),
  ('Budi S.', 'Jadi reseller di Fardax Store sudah 3 bulan, profit lumayan. Support tim juga responsif.', 5, 3),
  ('Dewi K.', 'Proses checkout mudah dan cepat. Pembayaran QRIS langsung konfirmasi. Mantap!', 4, 4),
  ('Rizky P.', 'Canva Pro murah banget disini. Sudah langganan rutin tiap bulan.', 5, 5),
  ('Anita W.', 'ChatGPT Plus tersedia dengan harga jauh lebih hemat. Sangat membantu kerja saya.', 5, 6);
