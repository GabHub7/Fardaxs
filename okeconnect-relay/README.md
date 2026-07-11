# okeconnect-relay

Kenapa ini ada: Vercel serverless function nggak punya IP keluar yang
tetap — tiap kali function-nya spin up (apalagi cold start), IP-nya bisa
beda, diambil random dari pool IP AWS. OkeConnect H2H justru menolak akses
kalau IP pengirimnya nggak cocok sama yang di-set di menu "Transaksi via
IP" di dashboard mereka — makanya pesan errornya "IP tidak sesuai @x.x.x.x"
tetap muncul walau sudah di-whitelist berkali-kali: begitu Vercel ganti
instance, IP-nya ikut ganti lagi.

Relay ini nggak mengubah logic OkeConnect sama sekali — cuma jadi
"jembatan" yang selalu keluar dari 1 IP yang sama, supaya whitelist di
OkeConnect cukup diisi sekali dan nggak pernah basi lagi.

Ini HARUS dijalankan di server yang IP publiknya asli statis — bukan
Vercel, bukan Netlify, bukan platform serverless/container lain yang
IP-nya ephemeral. VPS murah ($3-5/bulan, mis. Contabo, Vultr, Hostinger
VPS) sudah cukup — nggak butuh spek besar, servisnya ringan banget.

## Deploy

1. Upload folder `okeconnect-relay/` ini ke VPS (scp/git/FTP, terserah).
2. `npm install`
3. `cp .env.example .env` lalu isi `RELAY_SECRET` dengan string random
   yang panjang (contoh generate cepat: `openssl rand -hex 32`).
4. Jalankan dengan process manager biar auto-restart kalau VPS reboot:
   ```
   npm install -g pm2
   pm2 start server.js --name okeconnect-relay
   pm2 save
   pm2 startup
   ```
5. Cek IP publik VPS: `curl ifconfig.me`
6. Masuk dashboard OkeConnect -> Integrasi Transaksi -> Transaksi via IP
   -> masukkan IP dari langkah 5.

## Kasih HTTPS di depannya

Relay ini jalan polos di HTTP (port 3000). Karena app Fardaxs akan
manggil relay ini lewat internet, sebaiknya taruh di belakang reverse
proxy dengan HTTPS. Paling gampang pakai Caddy (auto HTTPS, gratis,
1 file config):

```
# Caddyfile
relay-anda.domain.com {
    reverse_proxy localhost:3000
}
```

Nggak punya domain / males setup DNS? Pakai Cloudflare Tunnel
(`cloudflared`) — dapat subdomain + HTTPS otomatis tanpa perlu buka port
apapun di VPS.

## Test relay-nya jalan

```
curl https://relay-anda.domain.com/health
# -> {"ok":true,"target":"https://h2h.okeconnect.com"}
```

## Sambungkan ke app Fardaxs

Set 2 env var ini (lewat Vercel dashboard, ATAU lewat panel admin
Fardaxs di Pengaturan -> Env Pembayaran, sudah tersedia field-nya setelah
migration `020_okeconnect_proxy_env_vars.sql` dijalankan):

```
OKECONNECT_PROXY_URL=https://relay-anda.domain.com/forward
OKECONNECT_PROXY_SECRET=<harus sama persis dengan RELAY_SECRET di .env relay>
```

Setelah itu langsung tes lagi di halaman Sistem -> Tes Koneksi
Pembayaran & Provider -> Uji Ulang.

Mau balik ke mode lama (app manggil OkeConnect langsung)? Kosongkan
`OKECONNECT_PROXY_URL` — tidak perlu redeploy kode apapun, karena
dibaca dari env var / panel admin di setiap request.
