# Fardax Store

Platform toko digital (PPOB, Premium Apps, Social Media Services) dibangun dengan Next.js 16 App Router + Supabase.

## Stack

- **Framework:** Next.js 16 (App Router, Server Components, Server Actions)
- **Database / Auth:** Supabase (Postgres + Row Level Security)
- **Styling:** Tailwind CSS v4
- **Validation:** Zod
- **Rate limiting:** Upstash Redis (opsional — fail-open jika tidak dikonfigurasi)
- **Pembayaran:** Cashify (QRIS / VA / e-wallet)
- **Provider PPOB:** OkeConnect (H2H API)
- **Email:** Resend
- **Notifikasi:** WhatsApp Bot (Baileys-compatible)

## Menjalankan secara lokal

```bash
npm install
cp .env.example .env.local   # lalu isi semua key yang dibutuhkan
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000).

## Environment Variables

Lihat `.env.example` untuk daftar lengkap env var yang dibutuhkan beserta penjelasannya. Minimal untuk development:

- `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` + `SUPABASE_SERVICE_ROLE_KEY` — wajib, aplikasi tidak akan jalan tanpa ini.
- `ENCRYPTION_KEY` — wajib jika menggunakan fitur inventory (kredensial akun terenkripsi).
- Sisanya (Cashify, OkeConnect, Resend, WhatsApp, Upstash) bisa dikosongkan saat development — fitur terkait akan gagal secara graceful (bukan crash) jika tidak dikonfigurasi.

## Database

Migration ada di `supabase/migrations/`, dijalankan berurutan:

1. `001_initial_schema.sql` — skema tabel inti
2. `002_rls_policies.sql` — Row Level Security policies
3. `003_seed_data.sql` — data awal (roles, permissions, dll)

Jalankan lewat Supabase CLI (`supabase db push`) atau tempel manual ke SQL Editor di Supabase Dashboard.

### Catatan penting skema

Tabel `users` **tidak punya kolom `role`** — role disimpan via `role_id` yang mereferensikan tabel `roles`. Saat query role seorang user, selalu join lewat relasi (`roles(name)`), jangan asumsikan ada kolom `role` langsung. Helper `requireAdmin()` di `src/lib/auth-guard.ts` sudah menangani ini dengan benar — gunakan helper itu untuk endpoint admin baru, jangan tulis ulang logic auth secara manual.

Juga, `users.id` (primary key internal) **berbeda** dari `users.auth_id` (Supabase Auth user id). Saat query berdasarkan user yang sedang login (`supabase.auth.getUser()`), selalu filter dengan `.eq('auth_id', user.id)`, bukan `.eq('id', user.id)`.

## Struktur Proyek

```
src/
  app/
    (auth)/          # halaman login, daftar, lupa password
    (store)/         # halaman publik toko (produk, checkout, akun)
    admin/           # panel admin (dilindungi middleware + role check)
    api/              # API routes (admin, checkout, webhooks, cron)
  components/        # komponen UI & layout
  features/auth/      # server actions untuk auth
  lib/                # supabase clients, auth-guard, encryption, providers, dll
  schemas/             # Zod validation schemas
  types/                # TypeScript type definitions
```

## Deploy

Proyek ini didesain untuk deploy di Vercel:

1. Import repo ke Vercel.
2. Set semua environment variables di Project Settings → Environment Variables.
3. Pastikan **Root Directory** di Vercel settings sesuai lokasi `package.json` (root, kecuali project ini berada di subfolder repo).
4. `vercel.json` sudah mengonfigurasi cron job harian untuk `/api/cron/check-provider-status`.

## Lisensi

Privat — hak cipta Fardax Store.
