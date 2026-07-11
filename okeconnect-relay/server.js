// ============================================================
// okeconnect-relay
// ------------------------------------------------------------
// Relay kecil yang tugasnya cuma satu: meneruskan request ke
// OkeConnect H2H dari 1 IP yang tetap.
//
// Kenapa perlu: Vercel serverless function tidak punya outbound IP
// tetap (IP-nya diambil random dari pool AWS tiap kali function
// di-spin up), sedangkan OkeConnect mengunci akses lewat 1 IP tetap
// (menu "Transaksi via IP" di dashboard OkeConnect). Jalankan file
// ini di VPS mana saja yang IP publiknya asli statis (bukan
// serverless/container ephemeral), whitelist IP VPS itu satu kali di
// OkeConnect, selesai — tidak perlu diganti-ganti lagi.
//
// App Next.js memanggil relay ini (bukan OkeConnect langsung) lewat
// env var OKECONNECT_PROXY_URL. Lihat README.md di folder ini untuk
// langkah deploy lengkap.
// ============================================================

const express = require('express')

const PORT = process.env.PORT || 3000
const RELAY_SECRET = process.env.RELAY_SECRET
const TARGET_BASE = (process.env.OKECONNECT_BASE_URL || 'https://h2h.okeconnect.com').replace(/\/$/, '')

if (!RELAY_SECRET) {
  console.error('RELAY_SECRET belum di-set. Isi dulu di file .env (lihat .env.example) sebelum menjalankan relay ini.')
  process.exit(1)
}

// Hanya izinkan path relatif yang wajar (mis. "/trx/balance") — mencegah
// path aneh-aneh dipakai untuk keluar dari TARGET_BASE.
const SAFE_PATH = /^\/[a-zA-Z0-9/_-]*$/

const app = express()
app.use(express.json())

app.get('/health', (req, res) => {
  res.json({ ok: true, target: TARGET_BASE })
})

app.post('/forward', async (req, res) => {
  if (req.header('x-relay-secret') !== RELAY_SECRET) {
    return res.status(401).json({ error: 'Unauthorized — x-relay-secret tidak cocok.' })
  }

  const { path, params } = req.body || {}

  if (typeof path !== 'string' || !SAFE_PATH.test(path)) {
    return res.status(400).json({ error: 'Path tidak valid.' })
  }

  const url = new URL(`${TARGET_BASE}${path}`)
  if (params && typeof params === 'object') {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, String(v))
    }
  }

  try {
    const upstream = await fetch(url.toString(), {
      method: 'GET',
      headers: { Accept: 'text/plain, application/json, */*' },
      signal: AbortSignal.timeout(25_000),
    })
    const text = await upstream.text()
    res.status(upstream.status).type('text/plain').send(text)
  } catch (err) {
    res.status(502).json({
      error: `Relay gagal menghubungi OkeConnect: ${err instanceof Error ? err.message : 'unknown error'}`,
    })
  }
})

// LiteSpeed (arenhost) me-require file ini lalu bind port sendiri. Kalau
// kita juga listen() manual, terjadi bentrok "listen() called more than
// once". Deteksi & sesuaikan (lihat catatan yang sama di server.js utama).
const mainFile = (require.main && require.main.filename) || '';
const runByManagedHost = /lsnode|passenger/i.test(mainFile);

if (runByManagedHost) {
  console.log(`okeconnect-relay siap (managed LiteSpeed/Passenger), target: ${TARGET_BASE}`)
  module.exports = app;
} else {
  app.listen(PORT, () => {
    console.log(`okeconnect-relay jalan di port ${PORT}, meneruskan ke ${TARGET_BASE}`)
  })
  module.exports = app;
}
