-- ============================================================
-- FARDAX STORE - SEED SAMPLE PRODUCTS
-- Sample digital products matching the mobile UI mockup so the storefront
-- isn't empty out of the box. Admins can edit/replace these from the panel.
--
-- `image_url` stores a logo slug (e.g. 'logo:netflix') instead of an actual
-- uploaded image — the storefront renders known slugs as brand-colored
-- logos client-side (see src/components/store/product-logo.tsx) rather
-- than depending on uploaded image assets that don't exist yet. Admins
-- replacing a product's image with a real upload will simply override it.
-- ============================================================

INSERT INTO products (
  category_id, name, slug, short_description, image_url,
  base_cost, selling_price, reseller_price,
  fulfillment_type, target_type, target_label, target_placeholder,
  status, is_featured, sort_order
) VALUES
  (
    (SELECT id FROM categories WHERE slug = 'design'),
    'Canva Pro', 'canva-pro', '1 Bulan', 'logo:canva',
    4000, 5000, 4500,
    'MANUAL', 'EMAIL', 'Email Akun', 'Masukkan email akun Canva',
    'ACTIVE', TRUE, 1
  ),
  (
    (SELECT id FROM categories WHERE slug = 'ai-tools'),
    'ChatGPT Plus', 'chatgpt-plus', '1 Bulan', 'logo:chatgpt',
    17000, 20000, 18500,
    'MANUAL', 'EMAIL', 'Email Akun', 'Masukkan email akun OpenAI',
    'ACTIVE', TRUE, 2
  ),
  (
    (SELECT id FROM categories WHERE slug = 'streaming'),
    'Netflix Premium', 'netflix-premium', '1 Bulan', 'logo:netflix',
    12000, 15000, 13500,
    'MANUAL', 'EMAIL', 'Email Akun', 'Masukkan email akun Netflix',
    'ACTIVE', TRUE, 3
  ),
  (
    (SELECT id FROM categories WHERE slug = 'streaming'),
    'Disney+ Hotstar', 'disney-hotstar', '1 Bulan', 'logo:disney',
    9500, 12000, 11000,
    'MANUAL', 'EMAIL', 'Email Akun', 'Masukkan email akun Disney+',
    'ACTIVE', TRUE, 4
  ),
  (
    (SELECT id FROM categories WHERE slug = 'streaming'),
    'Spotify Premium', 'spotify-premium', '1 Bulan', 'logo:spotify',
    8000, 10000, 9000,
    'MANUAL', 'EMAIL', 'Email Akun', 'Masukkan email akun Spotify',
    'ACTIVE', TRUE, 5
  ),
  (
    (SELECT id FROM categories WHERE slug = 'streaming'),
    'YouTube Premium', 'youtube-premium', '1 Bulan', 'logo:youtube',
    10000, 12000, 11000,
    'MANUAL', 'EMAIL', 'Email Akun', 'Masukkan email akun YouTube',
    'ACTIVE', TRUE, 6
  );
