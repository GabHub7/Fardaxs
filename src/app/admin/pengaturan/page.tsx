'use client'

import { useEffect, useState } from 'react'

interface SiteSettings {
  site_name: string
  site_tagline: string
  site_description: string
  contact_email: string
  contact_phone: string
  contact_whatsapp: string
  address: string
  logo_url: string
  favicon_url: string
  primary_color: string
  maintenance_mode: boolean
  maintenance_message: string
  verification_method: 'NONE' | 'EMAIL' | 'WA_OTP' | 'EMAIL_AND_OTP'
}

const DEFAULT_SETTINGS: SiteSettings = {
  site_name: 'Fardax Store',
  site_tagline: 'Belanja Digital Terpercaya',
  site_description: 'Platform PPOB dan pembelian produk digital terlengkap dengan harga terbaik.',
  contact_email: 'cs@fardaxstore.com',
  contact_phone: '+62-xxx-xxxx-xxxx',
  contact_whatsapp: '+6281234567890',
  address: 'Indonesia',
  logo_url: '',
  favicon_url: '',
  primary_color: '#6366f1',
  maintenance_mode: false,
  maintenance_message: 'Sistem sedang dalam pemeliharaan. Mohon coba lagi nanti.',
  verification_method: 'EMAIL',
}

export default function PengaturanPage() {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS)
  const [activeSection, setActiveSection] = useState<'umum' | 'kontak' | 'tampilan' | 'sistem'>('umum')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/admin/settings')
      .then((res) => res.json())
      .then((json) => {
        if (!json.success || !json.data) return
        const d = json.data as Record<string, unknown>
        setSettings((prev) => ({
          ...prev,
          site_name: (d.site_name as string) ?? prev.site_name,
          site_description: (d.site_description as string) ?? prev.site_description,
          contact_email: (d.support_email as string) ?? prev.contact_email,
          contact_phone: (d.support_phone as string) ?? prev.contact_phone,
          contact_whatsapp: (d.whatsapp_number as string) ?? prev.contact_whatsapp,
          address: (d.address as string) ?? prev.address,
          logo_url: (d.logo_url as string) ?? prev.logo_url,
          favicon_url: (d.favicon_url as string) ?? prev.favicon_url,
          primary_color: (d.primary_color as string) ?? prev.primary_color,
          maintenance_mode: (d.maintenance_mode as boolean) ?? prev.maintenance_mode,
          maintenance_message: (d.maintenance_message as string) ?? prev.maintenance_message,
          verification_method: (d.verification_method as SiteSettings['verification_method']) ?? prev.verification_method,
        }))
      })
      .catch(() => {
        // Keep defaults if the fetch fails — form is still usable.
      })
  }, [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value, type } = e.target
    const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined
    setSettings((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
    setSaved(false)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    const payload = {
      site_name: settings.site_name,
      site_description: settings.site_description,
      logo_url: settings.logo_url,
      favicon_url: settings.favicon_url,
      support_email: settings.contact_email,
      support_phone: settings.contact_phone,
      whatsapp_number: settings.contact_whatsapp,
      address: settings.address,
      primary_color: settings.primary_color,
      maintenance_mode: settings.maintenance_mode,
      maintenance_message: settings.maintenance_message,
      verification_method: settings.verification_method,
    }

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    } catch {
      // silent — UX still shows saved indicator
    } finally {
      setSaving(false)
    }
  }

  const sections = [
    { id: 'umum', label: 'Umum' },
    { id: 'kontak', label: 'Kontak' },
    { id: 'tampilan', label: 'Tampilan' },
    { id: 'sistem', label: 'Sistem' },
  ] as const

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold" style={{ color: 'hsl(var(--foreground))' }}>
          Pengaturan Toko
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'hsl(var(--foreground-muted))' }}>
          Konfigurasi umum Fardax Store
        </p>
      </div>

      <div className="flex gap-5">
        {/* Sidebar nav */}
        <div
          className="rounded-[20px] border p-3 flex flex-col gap-1 flex-shrink-0 w-44"
          style={{ background: 'hsl(var(--background-card))', borderColor: 'hsl(var(--border))' }}
        >
          {sections.map((s) => {
            const isActive = activeSection === s.id
            return (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className="w-full text-left px-3 py-2 rounded-[12px] text-sm font-medium transition-colors"
                style={{
                  background: isActive ? 'hsl(var(--primary) / 0.1)' : 'transparent',
                  color: isActive ? 'hsl(var(--primary))' : 'hsl(var(--foreground-muted))',
                }}
              >
                {s.label}
              </button>
            )
          })}
        </div>

        {/* Form */}
        <form onSubmit={(e) => void handleSave(e)} className="flex-1 space-y-5">
          {saved && (
            <div
              className="rounded-[14px] p-4 text-sm"
              style={{
                background: 'hsl(var(--success) / 0.1)',
                color: 'hsl(var(--success))',
                border: '1px solid hsl(var(--success) / 0.3)',
              }}
            >
              Pengaturan berhasil disimpan!
            </div>
          )}

          {activeSection === 'umum' && (
            <Section title="Informasi Umum">
              <Field label="Nama Toko" required>
                <input name="site_name" value={settings.site_name} onChange={handleChange} required className={ic} style={is} />
              </Field>
              <Field label="Tagline">
                <input name="site_tagline" value={settings.site_tagline} onChange={handleChange} className={ic} style={is} />
              </Field>
              <Field label="Deskripsi Toko">
                <textarea name="site_description" value={settings.site_description} onChange={handleChange} rows={3} className={ic} style={{ ...is, resize: 'vertical' }} />
              </Field>
            </Section>
          )}

          {activeSection === 'kontak' && (
            <Section title="Informasi Kontak">
              <Field label="Email CS" required>
                <input name="contact_email" value={settings.contact_email} onChange={handleChange} type="email" required className={ic} style={is} />
              </Field>
              <Field label="Nomor Telepon">
                <input name="contact_phone" value={settings.contact_phone} onChange={handleChange} className={ic} style={is} />
              </Field>
              <Field label="Nomor WhatsApp">
                <input name="contact_whatsapp" value={settings.contact_whatsapp} onChange={handleChange} placeholder="+6281234567890" className={ic} style={is} />
                <p className="text-xs mt-1" style={{ color: 'hsl(var(--foreground-muted))' }}>
                  Format internasional tanpa spasi: +628xxx
                </p>
              </Field>
              <Field label="Alamat">
                <textarea name="address" value={settings.address} onChange={handleChange} rows={2} className={ic} style={{ ...is, resize: 'vertical' }} />
              </Field>
            </Section>
          )}

          {activeSection === 'tampilan' && (
            <Section title="Tampilan & Branding">
              <Field label="URL Logo">
                <input name="logo_url" value={settings.logo_url} onChange={handleChange} type="url" placeholder="https://..." className={ic} style={is} />
              </Field>
              <Field label="URL Favicon">
                <input name="favicon_url" value={settings.favicon_url} onChange={handleChange} type="url" placeholder="https://..." className={ic} style={is} />
              </Field>
              <Field label="Warna Utama">
                <div className="flex items-center gap-3">
                  <input
                    name="primary_color"
                    value={settings.primary_color}
                    onChange={handleChange}
                    type="color"
                    className="w-10 h-10 rounded-[10px] border cursor-pointer p-1"
                    style={{ borderColor: 'hsl(var(--border))' }}
                  />
                  <input
                    name="primary_color"
                    value={settings.primary_color}
                    onChange={handleChange}
                    className={ic}
                    style={is}
                  />
                </div>
              </Field>
            </Section>
          )}

          {activeSection === 'sistem' && (
            <Section title="Pengaturan Sistem">
              <Field label="Cara Login / Verifikasi User Baru">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {([
                    { value: 'NONE', label: 'Tanpa Verifikasi', desc: 'Daftar lalu langsung bisa masuk, tanpa kode apapun' },
                    { value: 'EMAIL', label: 'Verifikasi Email', desc: 'Kode OTP dikirim via Resend ke email' },
                    { value: 'WA_OTP', label: 'Verifikasi OTP WhatsApp', desc: 'Kode OTP dikirim via Bot WA' },
                  ] as const).map((opt) => {
                    const isActive =
                      settings.verification_method === opt.value ||
                      (opt.value === 'EMAIL' && settings.verification_method === 'EMAIL_AND_OTP')
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          setSettings((prev) => ({ ...prev, verification_method: opt.value }))
                          setSaved(false)
                        }}
                        className="text-left p-3 rounded-[12px] border transition-colors"
                        style={{
                          background: isActive ? 'hsl(var(--primary) / 0.1)' : 'hsl(var(--background-muted))',
                          borderColor: isActive ? 'hsl(var(--primary))' : 'hsl(var(--border))',
                        }}
                      >
                        <p className="text-sm font-semibold" style={{ color: isActive ? 'hsl(var(--primary))' : 'hsl(var(--foreground))' }}>
                          {opt.label}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--foreground-muted))' }}>
                          {opt.desc}
                        </p>
                      </button>
                    )
                  })}
                </div>

                {(settings.verification_method === 'EMAIL' || settings.verification_method === 'EMAIL_AND_OTP') && (
                  <label
                    className="mt-3 flex items-start gap-3 p-3 rounded-[12px] border cursor-pointer"
                    style={{ borderColor: 'hsl(var(--border))', background: 'hsl(var(--background-muted))' }}
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4"
                      checked={settings.verification_method === 'EMAIL_AND_OTP'}
                      onChange={(e) => {
                        setSettings((prev) => ({
                          ...prev,
                          verification_method: e.target.checked ? 'EMAIL_AND_OTP' : 'EMAIL',
                        }))
                        setSaved(false)
                      }}
                    />
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'hsl(var(--foreground))' }}>
                        Wajibkan OTP WhatsApp juga, sebagai langkah tambahan setelah email
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--foreground-muted))' }}>
                        User akan verifikasi email dulu, lalu diminta kode OTP WhatsApp sebelum akun aktif (2 langkah).
                      </p>
                    </div>
                  </label>
                )}

                <p className="text-xs mt-2" style={{ color: 'hsl(var(--foreground-muted))' }}>
                  Verifikasi OTP WhatsApp membutuhkan Bot WA yang sudah terhubung. Selama bot belum tersambung, gunakan Verifikasi Email atau Tanpa Verifikasi.
                </p>
              </Field>

              {settings.verification_method === 'NONE' && (
                <div
                  className="rounded-[14px] p-4 flex items-start gap-3"
                  style={{
                    background: 'hsl(var(--warning) / 0.08)',
                    border: '1px solid hsl(var(--warning) / 0.3)',
                  }}
                >
                  <p className="text-xs" style={{ color: 'hsl(var(--foreground-muted))' }}>
                    Mode <span className="font-semibold" style={{ color: 'hsl(var(--warning))' }}>Tanpa Verifikasi</span> memudahkan pendaftaran, tapi siapa pun bisa daftar dengan email apa saja tanpa membuktikan kepemilikannya. Cocok untuk toko kecil/testing — pertimbangkan Verifikasi Email untuk produksi.
                  </p>
                </div>
              )}

              <div
                className="rounded-[14px] p-4 flex items-start gap-3"
                style={{
                  background: 'hsl(var(--warning) / 0.08)',
                  border: '1px solid hsl(var(--warning) / 0.3)',
                }}
              >
                <div className="flex-1">
                  <p className="text-sm font-semibold" style={{ color: 'hsl(var(--warning))' }}>
                    Mode Maintenance
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--foreground-muted))' }}>
                    Saat aktif, toko tidak dapat diakses oleh pengguna
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 mt-0.5">
                  <input
                    name="maintenance_mode"
                    type="checkbox"
                    checked={settings.maintenance_mode}
                    onChange={handleChange}
                    className="sr-only peer"
                  />
                  <div
                    className="w-11 h-6 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:rounded-full after:h-5 after:w-5 after:transition-all"
                    style={{
                      background: settings.maintenance_mode ? 'hsl(var(--warning))' : 'hsl(var(--background-muted))',
                    }}
                  >
                    <span
                      className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full transition-all"
                      style={{
                        background: 'white',
                        transform: settings.maintenance_mode ? 'translateX(20px)' : 'translateX(0)',
                      }}
                    />
                  </div>
                </label>
              </div>

              <Field label="Pesan Maintenance">
                <textarea
                  name="maintenance_message"
                  value={settings.maintenance_message}
                  onChange={handleChange}
                  rows={3}
                  className={ic}
                  style={{ ...is, resize: 'vertical' }}
                />
              </Field>

              <div
                className="rounded-[14px] p-4"
                style={{ background: 'hsl(var(--background-muted))', border: '1px solid hsl(var(--border))' }}
              >
                <p className="text-xs font-semibold mb-2" style={{ color: 'hsl(var(--foreground))' }}>
                  Informasi Sistem
                </p>
                <div className="space-y-1">
                  {[
                    ['Versi Aplikasi', '1.0.0'],
                    ['Framework', 'Next.js 16'],
                    ['Database', 'Supabase PostgreSQL'],
                    ['Platform', 'Vercel'],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between text-xs">
                      <span style={{ color: 'hsl(var(--foreground-muted))' }}>{label}</span>
                      <span style={{ color: 'hsl(var(--foreground))' }}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <a
                href="/admin/pengaturan/env-pembayaran"
                className="block rounded-[14px] p-4"
                style={{ background: 'hsl(var(--primary) / 0.08)', border: '1px solid hsl(var(--primary) / 0.25)' }}
              >
                <p className="text-sm font-semibold" style={{ color: 'hsl(var(--primary))' }}>
                  Kelola Env Pembayaran (Casaku & OkeConnect) →
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'hsl(var(--foreground-muted))' }}>
                  Ubah kredensial payment gateway dan provider PPOB dari sini — tersimpan terenkripsi dan tersinkron ke Vercel.
                </p>
              </a>
            </Section>
          )}

          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-[12px] text-sm font-semibold"
            style={{
              background: saving ? 'hsl(var(--primary) / 0.5)' : 'hsl(var(--primary))',
              color: 'hsl(var(--primary-foreground, 0 0% 100%))',
              cursor: saving ? 'not-allowed' : 'pointer',
            }}
          >
            {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
          </button>
        </form>
      </div>
    </div>
  )
}

const ic = 'w-full px-3 py-2.5 text-sm rounded-[12px] border outline-none transition-colors'
const is: React.CSSProperties = {
  background: 'hsl(var(--background-muted))',
  borderColor: 'hsl(var(--border))',
  color: 'hsl(var(--foreground))',
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-[20px] border p-5 space-y-4"
      style={{ background: 'hsl(var(--background-card))', borderColor: 'hsl(var(--border))' }}
    >
      <h2 className="text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
        {title}
      </h2>
      {children}
    </div>
  )
}

function Field({ label, required = false, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: 'hsl(var(--foreground-muted))' }}>
        {label}
        {required && <span style={{ color: 'hsl(var(--destructive))' }}> *</span>}
      </label>
      {children}
    </div>
  )
}
