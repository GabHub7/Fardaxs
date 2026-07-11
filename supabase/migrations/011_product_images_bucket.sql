-- ============================================================
-- 011_product_images_bucket.sql
-- Public Storage bucket for product images uploaded from the admin panel.
--
-- Uploads happen through the admin API using the service role (bypasses
-- RLS), and the bucket is public so the returned URL renders on the
-- storefront. Idempotent.
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images', 'product-images', TRUE, 5242880,
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE
  SET public = TRUE,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Allow anyone to read objects in this (public) bucket.
DROP POLICY IF EXISTS "product-images public read" ON storage.objects;
CREATE POLICY "product-images public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');
