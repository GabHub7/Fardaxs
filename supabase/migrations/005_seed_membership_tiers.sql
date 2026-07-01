-- ============================================================
-- FARDAX STORE - SEED MEMBERSHIP TIERS
-- ============================================================

INSERT INTO membership_tiers (id, name, slug, min_spend, cashback_percent, badge_color, sort_order) VALUES
  ('00000000-0000-0000-0000-000000000101', 'Bronze',   'bronze',   0,         0,   '#A0644A', 1),
  ('00000000-0000-0000-0000-000000000102', 'Silver',   'silver',   500000,    0.5, '#94A3B8', 2),
  ('00000000-0000-0000-0000-000000000103', 'Gold',     'gold',     2000000,   1.0, '#EAB308', 3),
  ('00000000-0000-0000-0000-000000000104', 'Platinum', 'platinum', 10000000,  2.0, '#60A5FA', 4);

-- Default every existing user to Bronze; they'll be re-evaluated as they spend.
UPDATE users SET membership_tier_id = '00000000-0000-0000-0000-000000000101'
WHERE membership_tier_id IS NULL;
