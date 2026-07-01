/**
 * FARDAX STORE — WhatsApp Bot v2
 * Dual mode: Notifikasi sistem + Toko mandiri
 *
 * FITUR TOKO:
 *  - Browse produk & kategori via chat
 *  - Order produk digital (akun, voucher, dsb)
 *  - Order PPOB (pulsa, token listrik, dsb)
 *  - Checkout via Casaku (link payment)
 *  - Tracking pesanan
 *  - Topup saldo wallet
 *  - Kirim URL produk otomatis setelah order sukses
 *
 * FITUR NOTIFIKASI (dipanggil website):
 *  - OTP verifikasi, notif order, reminder bayar, invoice, dll
 */

const express = require('express')
const {
  makeWASocket, useMultiFileAuthState,
  DisconnectReason, fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys')
const qrcode   = require('qrcode-terminal')
const pino     = require('pino')
const crypto   = require('crypto')

// ─── CONFIG ─────────────────────────────────────────────────────────────────
const PORT        = process.env.PORT        || 3001
const BOT_TOKEN   = process.env.BOT_TOKEN   || 'fardax-bot-secret'
const STORE_NAME  = process.env.STORE_NAME  || 'Fardax Store'
const STORE_URL   = process.env.STORE_URL   || 'https://fardaxstore.com'
const WEBSITE_URL = process.env.WEBSITE_URL || STORE_URL   // base URL website (untuk API call)
const AUTH_DIR    = process.env.AUTH_DIR    || './auth_info'
const OTP_TTL_MS  = 5 * 60 * 1000
const SESSION_TTL_MS = 30 * 60 * 1000 // sesi toko 30 menit idle

// ─── STATE ──────────────────────────────────────────────────────────────────
const otpStore     = new Map()   // phone → { otp, expiresAt, attempts }
const userSessions = new Map()   // phone → { step, data, updatedAt }

let sock        = null
let isConnected = false
let botName     = null

// ─── LOGGER ─────────────────────────────────────────────────────────────────
const logger = pino({ level: 'warn' })

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function normalizePhone(phone) {
  let p = phone.replace(/[\s\-\+]/g, '')
  if (p.startsWith('0')) p = '62' + p.slice(1)
  if (!p.includes('@')) p = p + '@s.whatsapp.net'
  return p
}

function phoneFromJid(jid) {
  return jid.replace('@s.whatsapp.net', '').replace('@g.us', '')
}

function formatRupiah(amount) {
  if (amount == null) return '-'
  return 'Rp ' + Number(amount).toLocaleString('id-ID')
}

function formatDate(isoString) {
  try {
    return new Date(isoString).toLocaleString('id-ID', {
      day: '2-digit', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta',
    }) + ' WIB'
  } catch { return isoString }
}

function generateOtp() {
  return crypto.randomInt(100000, 999999).toString()
}

function getSession(phone) {
  const s = userSessions.get(phone)
  if (!s) return null
  if (Date.now() - s.updatedAt > SESSION_TTL_MS) {
    userSessions.delete(phone)
    return null
  }
  return s
}

function setSession(phone, data) {
  userSessions.set(phone, { ...data, updatedAt: Date.now() })
}

function clearSession(phone) {
  userSessions.delete(phone)
}

// ─── API CALLER KE WEBSITE ───────────────────────────────────────────────────
// Endpoint /api/checkout/bot, /api/wallet/topup/bot, dan
// /api/orders/by-number/* di website mewajibkan header x-bot-token yang
// cocok dengan WHATSAPP_BOT_TOKEN di env var website — tanpa ini, semua
// request transaksi dari bot akan ditolak 401 Unauthorized.
async function apiWebsite(path, body, method = 'POST') {
  try {
    const res = await fetch(`${WEBSITE_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-bot-token': BOT_TOKEN,
      },
      body: method !== 'GET' ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(15000),
    })
    return await res.json()
  } catch (err) {
    return { success: false, message: err.message }
  }
}

// ─── WA SEND ────────────────────────────────────────────────────────────────
async function sendMessage(jid, text) {
  if (!isConnected || !sock) return false
  try {
    await sock.sendMessage(jid, { text })
    return true
  } catch (err) {
    console.error('Send error:', err.message)
    return false
  }
}

// ─── TEKS MENU ───────────────────────────────────────────────────────────────
function menuUtama() {
  return `🏪 *${STORE_NAME}*\n` +
    `━━━━━━━━━━━━━━━━━━━━\n\n` +
    `Halo! Apa yang kamu butuhkan?\n\n` +
    `1️⃣  Produk Digital\n` +
    `2️⃣  PPOB (Pulsa, Listrik, dll)\n` +
    `3️⃣  Topup Saldo\n` +
    `4️⃣  Cek Pesanan\n` +
    `5️⃣  Bantuan / CS\n\n` +
    `Ketik angka atau nama menu.\n` +
    `Ketik *batal* untuk keluar kapan saja.`
}

function menuMetodePembayaran() {
  return `💳 *Pilih Metode Pembayaran:*\n\n` +
    `1️⃣  QRIS\n` +
    `2️⃣  Virtual Account BCA\n` +
    `3️⃣  Virtual Account BNI\n` +
    `4️⃣  Virtual Account BRI\n` +
    `5️⃣  Virtual Account Mandiri\n` +
    `6️⃣  GoPay\n` +
    `7️⃣  OVO\n` +
    `8️⃣  DANA\n` +
    `9️⃣  ShopeePay\n\n` +
    `Ketik angka pilihan:`
}

const PAYMENT_MAP = {
  '1': 'QRIS',
  '2': 'VA_BCA',
  '3': 'VA_BNI',
  '4': 'VA_BRI',
  '5': 'VA_MANDIRI',
  '6': 'GOPAY',
  '7': 'OVO',
  '8': 'DANA',
  '9': 'SHOPEEPAY',
}

// ─── FLOW TOKO ───────────────────────────────────────────────────────────────

async function handleMenuUtama(jid, phone, text) {
  const t = text.trim()

  if (t === '1' || t === 'produk' || t === 'produk digital') {
    // Ambil produk non-PPOB dari website
    const res = await apiWebsite('/api/products?limit=20', null, 'GET')
    if (!res.success || !res.data?.length) {
      return sendMessage(jid, '⚠️ Gagal memuat produk. Coba lagi nanti.')
    }

    const products = res.data.filter(p => p.category?.slug !== 'ppob')
    if (!products.length) {
      return sendMessage(jid, '📦 Belum ada produk tersedia saat ini.')
    }

    let msg = `📦 *Daftar Produk Digital:*\n━━━━━━━━━━━━━━━━━━━━\n\n`
    products.forEach((p, i) => {
      msg += `${i + 1}. *${p.name}*\n`
      msg += `   💰 ${formatRupiah(p.selling_price)}\n`
      if (p.short_description) msg += `   📝 ${p.short_description}\n`
      msg += `\n`
    })
    msg += `Ketik *nomor* produk untuk order.\nContoh: ketik *1* untuk produk pertama.`

    setSession(phone, { step: 'PILIH_PRODUK', data: { products } })
    return sendMessage(jid, msg)
  }

  if (t === '2' || t === 'ppob' || t === 'pulsa' || t === 'listrik') {
    const res = await apiWebsite('/api/products?category=ppob&limit=20', null, 'GET')
    if (!res.success || !res.data?.length) {
      return sendMessage(jid, '⚠️ Gagal memuat produk PPOB. Coba lagi nanti.')
    }

    let msg = `⚡ *Menu PPOB:*\n━━━━━━━━━━━━━━━━━━━━\n\n`
    res.data.forEach((p, i) => {
      msg += `${i + 1}. *${p.name}*\n`
      msg += `   💰 ${formatRupiah(p.selling_price)}\n\n`
    })
    msg += `Ketik *nomor* layanan yang diinginkan.\n` +
      `Atau order langsung di website: ${STORE_URL}/ppob`

    setSession(phone, { step: 'PILIH_PRODUK', data: { products: res.data, isPpob: true } })
    return sendMessage(jid, msg)
  }

  if (t === '3' || t === 'topup' || t === 'topup saldo') {
    setSession(phone, { step: 'TOPUP_NOMINAL', data: {} })
    return sendMessage(jid,
      `💰 *Topup Saldo Wallet*\n\n` +
      `Masukkan nominal topup (min. Rp 10.000):\nContoh: *50000*`
    )
  }

  if (t === '4' || t === 'cek pesanan' || t === 'pesanan') {
    setSession(phone, { step: 'CEK_PESANAN', data: {} })
    return sendMessage(jid,
      `🔍 *Cek Status Pesanan*\n\nMasukkan nomor pesanan kamu:\nContoh: *FDX202406270001*`
    )
  }

  if (t === '5' || t === 'bantuan' || t === 'cs' || t === 'help') {
    clearSession(phone)
    return sendMessage(jid,
      `👨‍💻 *Bantuan & Customer Service*\n\n` +
      `📱 WhatsApp CS: ${process.env.CS_PHONE ?? 'Lihat di website'}\n` +
      `🌐 Website: ${STORE_URL}\n` +
      `❓ FAQ: ${STORE_URL}/akun/bantuan\n\n` +
      `Jam operasional: 08.00–22.00 WIB`
    )
  }

  // Tidak dikenali
  return sendMessage(jid, menuUtama())
}

async function handlePilihProduk(jid, phone, text, session) {
  const products = session.data.products
  const idx = parseInt(text.trim()) - 1

  if (isNaN(idx) || idx < 0 || idx >= products.length) {
    return sendMessage(jid, `❌ Pilihan tidak valid. Ketik angka 1–${products.length}.`)
  }

  const product = products[idx]
  setSession(phone, {
    step: session.data.isPpob ? 'INPUT_TARGET_PPOB' : 'INPUT_TARGET',
    data: { product }
  })

  if (session.data.isPpob) {
    return sendMessage(jid,
      `⚡ *${product.name}*\n` +
      `💰 Harga: ${formatRupiah(product.selling_price)}\n\n` +
      `Masukkan *nomor tujuan* (nomor HP/ID pelanggan/no meter):\nContoh: *08123456789*`
    )
  }

  return sendMessage(jid,
    `📦 *${product.name}*\n` +
    `💰 Harga: ${formatRupiah(product.selling_price)}\n` +
    (product.short_description ? `📝 ${product.short_description}\n` : '') +
    `\nMasukkan *ID/username/target* akun kamu:\n(Contoh: email, username, atau ID game)`
  )
}

async function handleInputTarget(jid, phone, text, session) {
  const { product } = session.data
  const target = text.trim()

  if (!target || target.length < 2) {
    return sendMessage(jid, '❌ Target tidak valid. Masukkan ID/username yang benar.')
  }

  setSession(phone, {
    step: 'KONFIRMASI_ORDER',
    data: { product, target }
  })

  return sendMessage(jid,
    `📋 *Konfirmasi Pesanan*\n` +
    `━━━━━━━━━━━━━━━━━━━━\n\n` +
    `📦 Produk: *${product.name}*\n` +
    `🎯 Target: *${target}*\n` +
    `💰 Harga: *${formatRupiah(product.selling_price)}*\n\n` +
    menuMetodePembayaran()
  )
}

async function handleKonfirmasiOrder(jid, phone, text, session) {
  const paymentMethod = PAYMENT_MAP[text.trim()]
  if (!paymentMethod) {
    return sendMessage(jid, `❌ Pilihan tidak valid. Ketik angka 1–9 untuk metode pembayaran.`)
  }

  const { product, target } = session.data
  await sendMessage(jid, `⏳ Memproses pesanan kamu...`)

  // Buat order via API website
  const res = await apiWebsite('/api/checkout/bot', {
    product_id: product.id,
    target,
    quantity: 1,
    payment_method: paymentMethod,
    phone,
  })

  if (!res.success) {
    clearSession(phone)
    return sendMessage(jid,
      `❌ Gagal membuat pesanan: ${res.message ?? 'Terjadi kesalahan'}\n\n` +
      `Ketik *menu* untuk kembali.`
    )
  }

  const order = res.data
  clearSession(phone)

  let paymentInfo = ''
  if (order.payment_url) {
    paymentInfo += `\n🔗 *Link Pembayaran:*\n${order.payment_url}`
  }
  if (order.va_number) {
    paymentInfo += `\n🏦 *Nomor VA:* ${order.va_number}`
  }
  if (order.qr_url) {
    paymentInfo += `\n📷 *QR Code:* ${order.qr_url}`
  }

  return sendMessage(jid,
    `✅ *Pesanan Berhasil Dibuat!*\n` +
    `━━━━━━━━━━━━━━━━━━━━\n\n` +
    `📋 No. Pesanan: *${order.order_number}*\n` +
    `📦 Produk: *${product.name}*\n` +
    `🎯 Target: *${target}*\n` +
    `💰 Total: *${formatRupiah(order.amount)}*\n` +
    (order.expired_at ? `⏰ Bayar sebelum: ${formatDate(order.expired_at)}\n` : '') +
    paymentInfo +
    `\n\nSetelah pembayaran terverifikasi, produk otomatis dikirim.\n` +
    `Cek pesanan: ketik *4* atau kunjungi ${STORE_URL}/pesanan/${order.order_number}`
  )
}

async function handleTopupNominal(jid, phone, text, session) {
  const nominal = parseInt(text.replace(/\D/g, ''))
  if (isNaN(nominal) || nominal < 10000) {
    return sendMessage(jid, '❌ Nominal minimal Rp 10.000. Masukkan angka yang valid.')
  }

  setSession(phone, {
    step: 'TOPUP_METODE',
    data: { nominal }
  })

  return sendMessage(jid,
    `💰 *Topup Saldo: ${formatRupiah(nominal)}*\n\n` +
    menuMetodePembayaran()
  )
}

async function handleTopupMetode(jid, phone, text, session) {
  const paymentMethod = PAYMENT_MAP[text.trim()]
  if (!paymentMethod) {
    return sendMessage(jid, '❌ Pilihan tidak valid. Ketik angka 1–9.')
  }

  const { nominal } = session.data
  await sendMessage(jid, '⏳ Membuat link topup...')

  const res = await apiWebsite('/api/wallet/topup/bot', {
    amount: nominal,
    payment_method: paymentMethod,
    phone,
  })

  clearSession(phone)

  if (!res.success) {
    return sendMessage(jid,
      `❌ Gagal membuat topup: ${res.message ?? 'Terjadi kesalahan'}\n\nKetik *menu* untuk kembali.`
    )
  }

  const t = res.data
  let paymentInfo = ''
  if (t.payment_url) paymentInfo += `\n🔗 *Link Pembayaran:*\n${t.payment_url}`
  if (t.va_number) paymentInfo += `\n🏦 *Nomor VA:* ${t.va_number}`

  return sendMessage(jid,
    `✅ *Topup Dibuat!*\n\n` +
    `💰 Nominal: *${formatRupiah(nominal)}*\n` +
    `💳 Metode: ${paymentMethod}\n` +
    (t.expired_at ? `⏰ Bayar sebelum: ${formatDate(t.expired_at)}\n` : '') +
    paymentInfo +
    `\n\nSaldo otomatis masuk setelah pembayaran berhasil.`
  )
}

async function handleCekPesanan(jid, phone, text, session) {
  const orderNo = text.trim().toUpperCase()
  if (!orderNo.startsWith('FDX') || orderNo.length < 10) {
    return sendMessage(jid,
      `❌ Format salah. Nomor pesanan dimulai dengan FDX.\nContoh: *FDX202406270001*`
    )
  }

  const res = await apiWebsite(`/api/orders/by-number/${orderNo}`, null, 'GET')
  clearSession(phone)

  if (!res.success || !res.data) {
    return sendMessage(jid,
      `❌ Pesanan *${orderNo}* tidak ditemukan.\n\nPastikan nomor pesanan sudah benar.`
    )
  }

  const o = res.data
  const statusEmoji = {
    PENDING_PAYMENT: '⏳', PAID: '💳', PROCESSING: '⚙️',
    SUCCESS: '✅', FAILED: '❌', REFUNDED: '↩️',
    EXPIRED: '🕐', CANCELLED: '🚫'
  }
  const emoji = statusEmoji[o.status] ?? '📋'

  return sendMessage(jid,
    `${emoji} *Status Pesanan*\n` +
    `━━━━━━━━━━━━━━━━━━━━\n\n` +
    `📋 No. Pesanan: *${o.order_number}*\n` +
    `📦 Produk: ${o.products?.name ?? '-'}\n` +
    `🎯 Target: ${o.target ?? '-'}\n` +
    `💰 Total: ${formatRupiah(o.total_price)}\n` +
    `📊 Status: *${o.status}*\n` +
    `📅 Dibuat: ${formatDate(o.created_at)}\n\n` +
    `Detail lengkap: ${STORE_URL}/pesanan/${o.order_number}`
  )
}

// ─── ROUTER PESAN MASUK ──────────────────────────────────────────────────────
async function handleIncomingMessage(msg) {
  const from = msg.key.remoteJid
  // Abaikan pesan grup
  if (from.endsWith('@g.us')) return

  const text = (
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text || ''
  ).trim()

  if (!text) return

  const phone = phoneFromJid(from)
  const textLower = text.toLowerCase()

  // Command global — bisa dipanggil kapan saja
  if (['batal', 'cancel', 'keluar', 'exit'].includes(textLower)) {
    clearSession(phone)
    return sendMessage(from, `👋 Sesi dibatalkan.\n\nKetik *menu* untuk mulai lagi.`)
  }

  if (['menu', 'halo', 'hi', 'hello', 'start', '/start', 'mulai'].includes(textLower)) {
    clearSession(phone)
    return sendMessage(from, menuUtama())
  }

  const session = getSession(phone)

  // Tidak ada sesi aktif → tampilkan menu
  if (!session) {
    return sendMessage(from, menuUtama())
  }

  // Route berdasarkan step
  switch (session.step) {
    case 'PILIH_PRODUK':
      return handlePilihProduk(from, phone, text, session)

    case 'INPUT_TARGET':
    case 'INPUT_TARGET_PPOB':
      return handleInputTarget(from, phone, text, session)

    case 'KONFIRMASI_ORDER':
      return handleKonfirmasiOrder(from, phone, text, session)

    case 'TOPUP_NOMINAL':
      return handleTopupNominal(from, phone, text, session)

    case 'TOPUP_METODE':
      return handleTopupMetode(from, phone, text, session)

    case 'CEK_PESANAN':
      return handleCekPesanan(from, phone, text, session)

    default:
      clearSession(phone)
      return sendMessage(from, menuUtama())
  }
}

// ─── WA CLIENT ───────────────────────────────────────────────────────────────
async function startWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR)
  const { version } = await fetchLatestBaileysVersion()

  sock = makeWASocket({
    version,
    auth: state,
    logger,
    printQRInTerminal: false,
    browser: ['Fardax Bot', 'Chrome', '2.0.0'],
  })

  sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      console.log('\n📱 Scan QR ini untuk konek WhatsApp:\n')
      qrcode.generate(qr, { small: true })
    }
    if (connection === 'close') {
      isConnected = false
      botName = null
      const code = lastDisconnect?.error?.output?.statusCode
      const shouldReconnect = code !== DisconnectReason.loggedOut
      console.log(`❌ Koneksi terputus (${code}). Reconnect: ${shouldReconnect}`)
      if (shouldReconnect) setTimeout(startWhatsApp, 5000)
    }
    if (connection === 'open') {
      isConnected = true
      botName = sock.user?.name ?? sock.user?.verifiedName ?? null
      console.log(`✅ WhatsApp terhubung sebagai: ${botName ?? sock.user?.id}`)
    }
  })

  sock.ev.on('creds.update', saveCreds)
  sock.ev.on('messages.upsert', async ({ messages }) => {
    for (const msg of messages) {
      if (msg.key.fromMe || !msg.message) continue
      await handleIncomingMessage(msg)
    }
  })
}

// ─── EXPRESS API (dipanggil oleh website) ────────────────────────────────────
const app = express()
app.use(express.json())

// Auth middleware
app.use((req, res, next) => {
  if (req.path === '/health') return next()
  const token = req.headers['x-bot-token']
  if (!token || token !== BOT_TOKEN) {
    return res.status(401).json({ success: false, message: 'Unauthorized' })
  }
  next()
})

// GET /health
app.get('/health', (req, res) => {
  res.json({ status: isConnected ? 'connected' : 'disconnected', bot: botName, uptime: process.uptime() })
})

// POST /api/send
app.post('/api/send', async (req, res) => {
  const { phone, message } = req.body
  if (!phone || !message) return res.status(400).json({ success: false, message: 'phone dan message wajib' })
  const ok = await sendMessage(normalizePhone(phone), message)
  res.json({ success: ok })
})

// POST /api/send-otp
app.post('/api/send-otp', async (req, res) => {
  const { phone } = req.body
  if (!phone) return res.status(400).json({ success: false, message: 'phone wajib' })
  const otp = generateOtp()
  otpStore.set(phone, { otp, expiresAt: Date.now() + OTP_TTL_MS, attempts: 0 })
  const msg = `🔐 *Kode Verifikasi ${STORE_NAME}*\n\nKode OTP kamu:\n\n*${otp}*\n\n⏰ Berlaku 5 menit\n⚠️ Jangan bagikan kode ini ke siapapun.`
  const ok = await sendMessage(normalizePhone(phone), msg)
  if (!ok) return res.status(502).json({ success: false, message: 'Gagal kirim OTP' })
  res.json({ success: true, message: 'OTP dikirim' })
})

// POST /api/verify-otp
app.post('/api/verify-otp', (req, res) => {
  const { phone, otp } = req.body
  if (!phone || !otp) return res.status(400).json({ valid: false, message: 'phone dan otp wajib' })
  const entry = otpStore.get(phone)
  if (!entry) return res.json({ valid: false, message: 'Kode tidak ditemukan. Minta kode baru.' })
  if (Date.now() > entry.expiresAt) { otpStore.delete(phone); return res.json({ valid: false, message: 'Kode sudah kadaluarsa.' }) }
  if (entry.attempts >= 5) { otpStore.delete(phone); return res.json({ valid: false, message: 'Terlalu banyak percobaan.' }) }
  if (entry.otp !== String(otp).trim()) {
    entry.attempts++
    return res.json({ valid: false, message: `Kode salah. (${5 - entry.attempts} percobaan tersisa)` })
  }
  otpStore.delete(phone)
  res.json({ valid: true, message: 'OTP valid' })
})

// POST /api/send-order-created
app.post('/api/send-order-created', async (req, res) => {
  const { phone, name, order_number, amount, expired_at } = req.body
  if (!phone || !order_number) return res.status(400).json({ success: false })
  const expText = expired_at ? `\n⏰ Bayar sebelum: ${formatDate(expired_at)}` : ''
  const msg = `🛒 *Pesanan Berhasil Dibuat!*\n\nHalo ${name ?? 'Kak'}!\n\n` +
    `📋 No. Pesanan: *${order_number}*\n💰 Total: *${formatRupiah(amount)}*${expText}\n\n` +
    `Segera lakukan pembayaran.\n🔗 ${STORE_URL}/pesanan/${order_number}`
  res.json({ success: await sendMessage(normalizePhone(phone), msg) })
})

// POST /api/send-payment-success
app.post('/api/send-payment-success', async (req, res) => {
  const { phone, name, order_number, amount } = req.body
  if (!phone || !order_number) return res.status(400).json({ success: false })
  const msg = `✅ *Pembayaran Diterima!*\n\nHalo ${name ?? 'Kak'}!\n\n` +
    `📋 No. Pesanan: *${order_number}*\n💰 Jumlah: *${formatRupiah(amount)}*\n\n` +
    `⚙️ Pesanan sedang diproses...`
  res.json({ success: await sendMessage(normalizePhone(phone), msg) })
})

// POST /api/send-order-success  — kirim URL produk kalau ada
app.post('/api/send-order-success', async (req, res) => {
  const { phone, name, order_number, product_name, target, product_url, credentials } = req.body
  if (!phone || !order_number) return res.status(400).json({ success: false })

  let credText = ''
  if (credentials) {
    // credentials bisa object { email, password, url } atau string
    if (typeof credentials === 'string') {
      credText = `\n\n🔑 *Detail Akun:*\n${credentials}`
    } else {
      credText = `\n\n🔑 *Detail Akun:*`
      if (credentials.email)    credText += `\n📧 Email: ${credentials.email}`
      if (credentials.password) credText += `\n🔒 Password: ${credentials.password}`
      if (credentials.url)      credText += `\n🔗 URL: ${credentials.url}`
      if (credentials.note)     credText += `\n📝 Catatan: ${credentials.note}`
    }
  } else if (product_url) {
    credText = `\n\n🔗 *Link Produk:*\n${product_url}`
  }

  const msg = `🎉 *Pesanan Selesai!*\n\nHalo ${name ?? 'Kak'}!\n\n` +
    `📋 No. Pesanan: *${order_number}*\n📦 Produk: *${product_name ?? '-'}*\n🎯 Target: *${target ?? '-'}*` +
    credText +
    `\n\n⭐ Terima kasih sudah belanja di ${STORE_NAME}!`
  res.json({ success: await sendMessage(normalizePhone(phone), msg) })
})

// POST /api/send-order-failed
app.post('/api/send-order-failed', async (req, res) => {
  const { phone, name, order_number, reason } = req.body
  if (!phone || !order_number) return res.status(400).json({ success: false })
  const msg = `❌ *Pesanan Gagal*\n\nHalo ${name ?? 'Kak'}, maaf pesananmu tidak dapat diproses.\n\n` +
    `📋 No. Pesanan: *${order_number}*\n📝 Alasan: ${reason ?? 'Terjadi kesalahan sistem'}\n\n` +
    `Dana dikembalikan ke wallet dalam 1x24 jam.\n${STORE_URL}/akun/bantuan`
  res.json({ success: await sendMessage(normalizePhone(phone), msg) })
})

// POST /api/send-payment-reminder
app.post('/api/send-payment-reminder', async (req, res) => {
  const { phone, name, order_number, amount, expired_at } = req.body
  if (!phone || !order_number) return res.status(400).json({ success: false })
  const expText = expired_at ? `\n⏰ Batas bayar: *${formatDate(expired_at)}*` : ''
  const msg = `⏰ *Reminder Pembayaran*\n\nHalo ${name ?? 'Kak'}!\n\n` +
    `📋 No. Pesanan: *${order_number}*\n💰 Total: *${formatRupiah(amount)}*${expText}\n\n` +
    `Segera bayar sebelum pesanan dibatalkan!\n🔗 ${STORE_URL}/pembayaran/${order_number}`
  res.json({ success: await sendMessage(normalizePhone(phone), msg) })
})

// POST /api/notify-member-upgrade
app.post('/api/notify-member-upgrade', async (req, res) => {
  const { phone, name, tier_name, expired_at, benefits } = req.body
  if (!phone || !tier_name) return res.status(400).json({ success: false })
  const expText = expired_at ? `\n📅 Aktif hingga: *${formatDate(expired_at)}*` : ''
  const benefitText = Array.isArray(benefits) && benefits.length
    ? `\n\n✨ *Keuntungan kamu:*\n${benefits.map(b => `• ${b}`).join('\n')}`
    : ''
  const msg = `🌟 *Membership Diupgrade!*\n\nHalo ${name ?? 'Kak'}!\n\n` +
    `👑 Tier: *${tier_name}*${expText}${benefitText}\n\nNikmati keuntungan eksklusifmu di ${STORE_URL} 🎁`
  res.json({ success: await sendMessage(normalizePhone(phone), msg) })
})

// POST /api/notify-stock-update
app.post('/api/notify-stock-update', async (req, res) => {
  const { phone, product_name, stock_before, stock_after, action } = req.body
  if (!phone || !product_name) return res.status(400).json({ success: false })
  const emoji = stock_after === 0 ? '🔴' : stock_after <= 5 ? '🟡' : '🟢'
  const msg = `${emoji} *Update Stok: ${product_name}*\n\n` +
    `📊 Sebelum: ${stock_before ?? '-'} → Sekarang: *${stock_after}*\n` +
    (action ? `🔧 Aksi: ${action}\n` : '') + `⏰ ${formatDate(new Date().toISOString())}`
  res.json({ success: await sendMessage(normalizePhone(phone), msg) })
})

// POST /api/send-invoice
app.post('/api/send-invoice', async (req, res) => {
  const { phone, name, order_number, items, subtotal, discount, total, payment_method, paid_at } = req.body
  if (!phone || !order_number) return res.status(400).json({ success: false })
  const itemsText = Array.isArray(items) ? items.map(i => `  • ${i.name} — ${formatRupiah(i.price)}`).join('\n') : ''
  const discountText = discount ? `\n💸 Diskon: -${formatRupiah(discount)}` : ''
  const paidText = paid_at ? `\n✅ Dibayar: ${formatDate(paid_at)}` : ''
  const msg = `🧾 *Invoice ${STORE_NAME}*\n━━━━━━━━━━━━━━━━━━━━\n` +
    `Halo ${name ?? 'Kak'}!\n\n📋 No. Pesanan: *${order_number}*\n` +
    (itemsText ? `\n📦 Item:\n${itemsText}\n` : '') +
    `\n💰 Subtotal: ${formatRupiah(subtotal ?? total)}${discountText}\n` +
    `💵 Total: *${formatRupiah(total)}*\n💳 Metode: ${payment_method ?? '-'}${paidText}\n` +
    `━━━━━━━━━━━━━━━━━━━━\nTerima kasih sudah belanja di ${STORE_NAME}! 🙏`
  res.json({ success: await sendMessage(normalizePhone(phone), msg) })
})

// POST /api/broadcast
app.post('/api/broadcast', async (req, res) => {
  const { phones, message, delay_ms } = req.body
  if (!Array.isArray(phones) || !message) return res.status(400).json({ success: false })
  const delayMs = delay_ms ?? 2000
  res.json({ success: true, message: `Memulai broadcast ke ${phones.length} nomor` })
  let sent = 0, failed = 0
  for (const phone of phones) {
    const ok = await sendMessage(normalizePhone(phone), message)
    ok ? sent++ : failed++
    await new Promise(r => setTimeout(r, delayMs))
  }
  console.log(`📢 Broadcast selesai: ${sent} terkirim, ${failed} gagal`)
})

// ─── START ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Fardax WA Bot v2 berjalan di port ${PORT}`)
  console.log(`🔑 Token: ${BOT_TOKEN}`)
  console.log(`🌐 Website: ${WEBSITE_URL}`)
})

startWhatsApp()
