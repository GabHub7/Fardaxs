-- ============================================================
-- 016_wa_notif_toggle.sql
-- Adds a global on/off toggle for WhatsApp notifications, controllable
-- from Pengaturan → Bot WhatsApp in the admin panel. When disabled, the
-- website still calls lib/whatsapp.ts functions as usual, but the admin
-- can flip this to quickly silence WA notifications (e.g. while the bot
-- VPS is being restarted) without touching env vars or redeploying.
-- ============================================================

INSERT INTO site_settings (key, value) VALUES
  ('wa_notif_enabled', 'true')
ON CONFLICT (key) DO NOTHING;
