-- ============================================================
-- FARDAX STORE - ROW LEVEL SECURITY POLICIES
-- Version: 1.0
-- ============================================================

-- Helper function to get current user's role
CREATE OR REPLACE FUNCTION get_user_role(user_auth_id UUID)
RETURNS TEXT AS $$
  SELECT r.name FROM users u
  JOIN roles r ON r.id = u.role_id
  WHERE u.auth_id = user_auth_id AND u.deleted_at IS NULL
  LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_user_id(user_auth_id UUID)
RETURNS UUID AS $$
  SELECT id FROM users WHERE auth_id = user_auth_id AND deleted_at IS NULL LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT get_user_role(auth.uid()) IN ('ADMIN', 'SUPER_ADMIN');
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ============================================================
-- ENABLE RLS
-- ============================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_callbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventories ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE reseller_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE reseller_balance_mutations ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- USERS TABLE POLICIES
-- ============================================================

-- Users can read their own data
CREATE POLICY "users_select_own" ON users
  FOR SELECT USING (
    auth.uid() = auth_id OR is_admin()
  );

-- Users can update their own non-critical fields
CREATE POLICY "users_update_own" ON users
  FOR UPDATE USING (auth.uid() = auth_id)
  WITH CHECK (
    auth.uid() = auth_id
    -- Prevent users from changing their own role/status
    AND NEW.role_id = OLD.role_id
    AND NEW.status = OLD.status
    AND NEW.email_verified = OLD.email_verified
  );

-- Only service role can insert users
CREATE POLICY "users_insert_service" ON users
  FOR INSERT WITH CHECK (FALSE); -- only service role bypasses RLS

-- Admins can update user status/role
CREATE POLICY "users_admin_update" ON users
  FOR UPDATE USING (is_admin());

-- ============================================================
-- ORDERS TABLE POLICIES
-- ============================================================

-- Users can read their own orders
CREATE POLICY "orders_select_own" ON orders
  FOR SELECT USING (
    user_id = get_user_id(auth.uid()) OR is_admin()
  );

-- Users can insert their own orders (via service layer only)
CREATE POLICY "orders_insert" ON orders
  FOR INSERT WITH CHECK (
    user_id = get_user_id(auth.uid())
  );

-- Admins can update orders; users cannot change status
CREATE POLICY "orders_admin_update" ON orders
  FOR UPDATE USING (is_admin());

-- ============================================================
-- INVOICES TABLE POLICIES
-- ============================================================

CREATE POLICY "invoices_select" ON invoices
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = invoices.order_id
      AND (o.user_id = get_user_id(auth.uid()) OR is_admin())
    )
  );

-- ============================================================
-- PAYMENTS TABLE POLICIES
-- ============================================================

CREATE POLICY "payments_select" ON payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM invoices i
      JOIN orders o ON o.id = i.order_id
      WHERE i.id = payments.invoice_id
      AND (o.user_id = get_user_id(auth.uid()) OR is_admin())
    )
  );

-- ============================================================
-- PAYMENT CALLBACKS - ADMIN ONLY
-- ============================================================

CREATE POLICY "payment_callbacks_admin" ON payment_callbacks
  FOR SELECT USING (is_admin());

-- ============================================================
-- INVENTORIES - ADMIN ONLY (credentials are sensitive)
-- ============================================================

CREATE POLICY "inventories_admin" ON inventories
  FOR ALL USING (is_admin());

-- ============================================================
-- NOTIFICATIONS - OWN DATA
-- ============================================================

CREATE POLICY "notifications_select_own" ON notifications
  FOR SELECT USING (
    user_id = get_user_id(auth.uid()) OR is_admin()
  );

CREATE POLICY "notifications_update_own" ON notifications
  FOR UPDATE USING (
    user_id = get_user_id(auth.uid())
  );

-- ============================================================
-- RESELLER PROFILES - OWN DATA
-- ============================================================

CREATE POLICY "reseller_profiles_select" ON reseller_profiles
  FOR SELECT USING (
    user_id = get_user_id(auth.uid()) OR is_admin()
  );

CREATE POLICY "reseller_mutations_select" ON reseller_balance_mutations
  FOR SELECT USING (
    user_id = get_user_id(auth.uid()) OR is_admin()
  );

-- ============================================================
-- AUDIT LOGS - ADMIN ONLY
-- ============================================================

CREATE POLICY "audit_logs_admin" ON audit_logs
  FOR SELECT USING (is_admin());

-- Only service role can insert audit logs
CREATE POLICY "audit_logs_insert" ON audit_logs
  FOR INSERT WITH CHECK (FALSE);

-- ============================================================
-- PROVIDER LOGS - ADMIN ONLY
-- ============================================================

CREATE POLICY "provider_logs_admin" ON provider_logs
  FOR ALL USING (is_admin());

-- ============================================================
-- LOGIN ATTEMPTS - ADMIN ONLY
-- ============================================================

CREATE POLICY "login_attempts_admin" ON login_attempts
  FOR SELECT USING (is_admin());

-- ============================================================
-- PUBLIC READ POLICIES (Products, Categories, etc.)
-- ============================================================

-- Categories - public read for active ones
CREATE POLICY "categories_public_read" ON categories
  FOR SELECT USING (status = 'ACTIVE' OR is_admin());

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Products - public read for active ones
CREATE POLICY "products_public_read" ON products
  FOR SELECT USING (
    (status = 'ACTIVE' AND deleted_at IS NULL) OR is_admin()
  );

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Products admin write
CREATE POLICY "products_admin_write" ON products
  FOR ALL USING (is_admin());

-- Categories admin write
CREATE POLICY "categories_admin_write" ON categories
  FOR ALL USING (is_admin());

-- Providers - admin only
ALTER TABLE providers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "providers_admin" ON providers
  FOR ALL USING (is_admin());

-- CMS tables - public read, admin write
ALTER TABLE banners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "banners_public_read" ON banners
  FOR SELECT USING (status = 'ACTIVE');
CREATE POLICY "banners_admin_write" ON banners
  FOR ALL USING (is_admin());

ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "testimonials_public_read" ON testimonials
  FOR SELECT USING (status = 'ACTIVE');
CREATE POLICY "testimonials_admin_write" ON testimonials
  FOR ALL USING (is_admin());

ALTER TABLE faqs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "faqs_public_read" ON faqs
  FOR SELECT USING (status = 'ACTIVE');
CREATE POLICY "faqs_admin_write" ON faqs
  FOR ALL USING (is_admin());

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "announcements_public_read" ON announcements
  FOR SELECT USING (status = 'ACTIVE');
CREATE POLICY "announcements_admin_write" ON announcements
  FOR ALL USING (is_admin());

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "app_settings_admin" ON app_settings
  FOR ALL USING (is_admin());
