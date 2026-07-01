# Fardax Store — WhatsApp Bot v2
Dual mode: **Notifikasi sistem** + **Toko mandiri via WA**

---

## Cara Install

```bash
npm install
```

## Konfigurasi

**.env** (bot):
```env
PORT=3001
BOT_TOKEN=ganti-dengan-token-rahasia
STORE_NAME=Fardax Store
STORE_URL=https://fardaxstore.com
WEBSITE_URL=https://fardaxstore.com
AUTH_DIR=./auth_info
CS_PHONE=+6281234567890
```

**.env.local** (website Next.js):
```env
WHATSAPP_BOT_URL=http://localhost:3001
WHATSAPP_BOT_TOKEN=ganti-dengan-token-rahasia
```

---

## Cara Jalankan

```bash
node index.js
# atau dengan PM2:
pm2 start index.js --name fardax-wabot
```

---

## Fitur Toko via WA

User chat ke nomor bot, ketik:
- **menu** — tampilkan menu utama
- **1** — browse & order produk digital
- **2** — menu PPOB (pulsa, listrik, dll)
- **3** — topup saldo wallet
- **4** — cek status pesanan
- **5** — bantuan / CS
- **batal** — batalkan sesi

### Alur Order Produk:
```
User ketik menu
  → Pilih kategori (1/2)
  → Pilih produk (nomor)
  → Input target (ID/username/nomor)
  → Pilih metode pembayaran
  → Bot buat order via website API
  → Bot kirim link payment Cashify
  → User bayar
  → Webhook Cashify → website konfirmasi
  → Website fulfill order (OkeConnect/SMM)
  → Bot kirim URL/detail produk ke user WA
```

---

## Endpoint API (dipanggil website)

| Method | Path | Deskripsi |
|--------|------|-----------|
| GET | /health | Status koneksi |
| POST | /api/send | Kirim pesan bebas |
| POST | /api/send-otp | Generate & kirim OTP |
| POST | /api/verify-otp | Verifikasi OTP |
| POST | /api/send-order-created | Notif order dibuat |
| POST | /api/send-payment-success | Notif bayar sukses |
| POST | /api/send-order-success | Notif selesai + URL produk |
| POST | /api/send-order-failed | Notif gagal |
| POST | /api/send-payment-reminder | Reminder bayar |
| POST | /api/notify-member-upgrade | Notif upgrade member |
| POST | /api/notify-stock-update | Notif update stok |
| POST | /api/send-invoice | Kirim invoice |
| POST | /api/broadcast | Blast ke banyak nomor |

---

## File Baru di Website

Tambahkan 3 file ini ke source code website:

| File | Fungsi |
|------|--------|
| `src/app/api/checkout/bot/route.ts` | Checkout dari bot |
| `src/app/api/wallet/topup/bot/route.ts` | Topup saldo dari bot |
| `src/app/api/orders/by-number/[orderNumber]/route.ts` | Cek pesanan by nomor |

---

## Kirim URL Produk Otomatis

Di `src/lib/fulfillment.ts`, setelah order SUCCESS, tambahkan field `product_url` dan `credentials` ke `waNotifyOrderSuccess`:

```ts
await waNotifyOrderSuccess({
  phone: user.phone,
  name: user.full_name,
  order_number: order.order_number,
  product_name: product.name,
  target: order.target,
  product_url: 'https://link-produk.com/xxx',   // URL akun/voucher
  credentials: {                                  // opsional
    email: 'akun@email.com',
    password: 'password123',
    url: 'https://chatgpt.com',
    note: 'Jangan ganti password',
  },
})
```
