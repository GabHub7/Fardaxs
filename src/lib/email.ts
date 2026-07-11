import { Resend } from 'resend'

// Instantiated lazily so importing this module (e.g. during the production
// build's page-data collection) does not require RESEND_API_KEY to be set.
let resendClient: Resend | null = null
function getResend(): Resend {
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY)
  }
  return resendClient
}

// Accept either a single `RESEND_FROM` ("Name <email>") or the split
// `RESEND_FROM_NAME` + `RESEND_FROM_EMAIL` pair.
const FROM =
  process.env.RESEND_FROM ??
  (process.env.RESEND_FROM_EMAIL
    ? `${process.env.RESEND_FROM_NAME ?? 'Fardax Store'} <${process.env.RESEND_FROM_EMAIL}>`
    : 'Fardax Store <no-reply@fardax.store>')
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://fardax.store'

/**
 * Sends a 6-digit OTP code for email-based verification (registration,
 * password reset, etc). This is our own flow — independent of Supabase
 * Auth's built-in confirmation link, which depends on the project's Site
 * URL setting and breaks if that's misconfigured.
 */
export async function sendVerificationOtpEmail(params: {
  to: string
  name: string
  code: string
  purpose: 'REGISTER' | 'LOGIN_2FA' | 'RESET_PASSWORD'
}) {
  const { to, name, code, purpose } = params

  const heading =
    purpose === 'RESET_PASSWORD' ? 'Reset Password' : 'Verifikasi Akun Anda'
  const intro =
    purpose === 'RESET_PASSWORD'
      ? 'Gunakan kode berikut untuk mereset password akun Anda.'
      : 'Gunakan kode berikut untuk memverifikasi akun Fardax Store Anda.'

  await getResend().emails.send({
    from: FROM,
    to,
    subject: `${code} — Kode Verifikasi Fardax Store`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: -apple-system, sans-serif; background: #0d1117; color: #e6edf3; margin: 0; }
  .container { max-width: 480px; margin: 40px auto; padding: 24px; }
  .card { background: #161b22; border: 1px solid #21262d; border-radius: 16px; padding: 28px; text-align: center; }
  .logo { font-size: 22px; font-weight: 900; color: #3b82f6; margin-bottom: 24px; }
  h1 { font-size: 20px; margin: 0 0 8px; }
  p { color: #8d96a0; font-size: 14px; line-height: 1.6; margin: 0 0 16px; }
  .code { font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #3b82f6; background: #0d1117; border-radius: 12px; padding: 16px; margin: 20px 0; }
  .footer { font-size: 12px; color: #6e7681; text-align: center; margin-top: 24px; }
</style></head>
<body>
<div class="container">
  <div class="card">
    <div class="logo">Fardax Store</div>
    <h1>${heading}</h1>
    <p>Hai ${name}, ${intro}</p>
    <div class="code">${code}</div>
    <p>Kode berlaku selama 10 menit. Jangan bagikan kode ini ke siapa pun.</p>
  </div>
  <div class="footer">© 2025 Fardax Store. Semua hak dilindungi.</div>
</div>
</body>
</html>
    `.trim(),
  })
}

export async function sendOrderConfirmationEmail(params: {

  to: string
  name: string
  orderNumber: string
  productName: string
  amount: number
  orderId: string
}) {
  const { to, name, orderNumber, productName, amount, orderId } = params

  await getResend().emails.send({
    from: FROM,
    to,
    subject: `Pesanan ${orderNumber} dikonfirmasi — Fardax Store`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: -apple-system, sans-serif; background: #0d1117; color: #e6edf3; margin: 0; }
  .container { max-width: 560px; margin: 40px auto; padding: 24px; }
  .card { background: #161b22; border: 1px solid #21262d; border-radius: 16px; padding: 28px; }
  .logo { font-size: 22px; font-weight: 900; color: #3b82f6; margin-bottom: 24px; }
  h1 { font-size: 20px; margin: 0 0 8px; }
  p { color: #8d96a0; font-size: 14px; line-height: 1.6; margin: 0 0 16px; }
  .detail { background: #0d1117; border-radius: 12px; padding: 16px; margin: 20px 0; }
  .row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; border-bottom: 1px solid #21262d; }
  .row:last-child { border-bottom: none; font-weight: 700; color: #3b82f6; }
  .btn { display: inline-block; background: #3b82f6; color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-weight: 600; font-size: 14px; margin: 8px 0; }
  .footer { font-size: 12px; color: #6e7681; text-align: center; margin-top: 24px; }
</style></head>
<body>
<div class="container">
  <div class="card">
    <div class="logo">Fardax Store</div>
    <h1>Pesanan Diterima! 🎉</h1>
    <p>Hai ${name}, pesanan kamu telah kami terima dan sedang diproses.</p>
    <div class="detail">
      <div class="row"><span>Nomor Pesanan</span><span>${orderNumber}</span></div>
      <div class="row"><span>Produk</span><span>${productName}</span></div>
      <div class="row"><span>Total Bayar</span><span>Rp${amount.toLocaleString('id-ID')}</span></div>
    </div>
    <a href="${APP_URL}/pesanan/${orderId}" class="btn">Lihat Detail Pesanan</a>
    <p style="margin-top:16px">Jika ada pertanyaan, hubungi CS kami melalui WhatsApp.</p>
  </div>
  <div class="footer">© 2025 Fardax Store. Semua hak dilindungi.</div>
</div>
</body>
</html>
    `.trim(),
  })
}

export async function sendOrderSuccessEmail(params: {
  to: string
  name: string
  orderNumber: string
  productName: string
  orderId: string
}) {
  const { to, name, orderNumber, productName, orderId } = params

  await getResend().emails.send({
    from: FROM,
    to,
    subject: `Pesanan ${orderNumber} berhasil — Fardax Store`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: -apple-system, sans-serif; background: #0d1117; color: #e6edf3; margin: 0; }
  .container { max-width: 560px; margin: 40px auto; padding: 24px; }
  .card { background: #161b22; border: 1px solid #21262d; border-radius: 16px; padding: 28px; }
  .logo { font-size: 22px; font-weight: 900; color: #3b82f6; margin-bottom: 24px; }
  .check { font-size: 48px; text-align: center; margin: 8px 0 20px; }
  h1 { font-size: 20px; margin: 0 0 8px; }
  p { color: #8d96a0; font-size: 14px; line-height: 1.6; margin: 0 0 16px; }
  .btn { display: inline-block; background: #22c55e; color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-weight: 600; font-size: 14px; }
  .footer { font-size: 12px; color: #6e7681; text-align: center; margin-top: 24px; }
</style></head>
<body>
<div class="container">
  <div class="card">
    <div class="logo">Fardax Store</div>
    <div class="check">✅</div>
    <h1>Pesanan Berhasil!</h1>
    <p>Hai ${name}, pesanan <strong>${productName}</strong> kamu (${orderNumber}) telah berhasil diproses.</p>
    <a href="${APP_URL}/pesanan/${orderId}" class="btn">Lihat Detail Pesanan</a>
  </div>
  <div class="footer">© 2025 Fardax Store.</div>
</div>
</body>
</html>
    `.trim(),
  })
}

export async function sendPasswordResetEmail(params: {
  to: string
  resetLink: string
}) {
  const { to, resetLink } = params

  await getResend().emails.send({
    from: FROM,
    to,
    subject: 'Reset Password — Fardax Store',
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: -apple-system, sans-serif; background: #0d1117; color: #e6edf3; margin: 0; }
  .container { max-width: 520px; margin: 40px auto; padding: 24px; }
  .card { background: #161b22; border: 1px solid #21262d; border-radius: 16px; padding: 32px; }
  .logo { font-size: 22px; font-weight: 900; color: #3b82f6; margin-bottom: 24px; }
  h1 { font-size: 20px; margin: 0 0 10px; }
  p { color: #8d96a0; font-size: 14px; line-height: 1.6; margin: 0 0 20px; }
  .btn { display: inline-block; background: #3b82f6; color: #fff !important; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-weight: 700; font-size: 15px; }
  .note { font-size: 12px; color: #6e7681; margin-top: 20px; }
  .footer { font-size: 12px; color: #6e7681; text-align: center; margin-top: 24px; }
</style></head>
<body>
<div class="container">
  <div class="card">
    <div class="logo">Fardax Store</div>
    <h1>🔐 Reset Password</h1>
    <p>Kami menerima permintaan reset password untuk akun ini. Klik tombol di bawah untuk membuat password baru.</p>
    <a href="${resetLink}" class="btn">Reset Password Saya</a>
    <p class="note">Link ini berlaku selama <strong>1 jam</strong>. Jika kamu tidak meminta reset password, abaikan email ini — akun kamu aman.</p>
  </div>
  <div class="footer">© 2025 Fardax Store. Semua hak dilindungi.</div>
</div>
</body>
</html>
    `.trim(),
  })
}

export async function sendPaymentReminderEmail(params: {
  to: string
  name: string
  orderNumber: string
  amount: number
  expiredAt: string
  orderId: string
}) {
  const { to, name, orderNumber, amount, expiredAt, orderId } = params

  await getResend().emails.send({
    from: FROM,
    to,
    subject: `Segera selesaikan pembayaran ${orderNumber} — Fardax Store`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: -apple-system, sans-serif; background: #0d1117; color: #e6edf3; margin: 0; }
  .container { max-width: 560px; margin: 40px auto; padding: 24px; }
  .card { background: #161b22; border: 1px solid #f59e0b44; border-radius: 16px; padding: 28px; }
  .logo { font-size: 22px; font-weight: 900; color: #3b82f6; margin-bottom: 24px; }
  h1 { font-size: 20px; margin: 0 0 8px; }
  p { color: #8d96a0; font-size: 14px; line-height: 1.6; margin: 0 0 16px; }
  .warning { background: #f59e0b22; border: 1px solid #f59e0b44; border-radius: 10px; padding: 12px 16px; color: #f59e0b; font-size: 13px; margin: 16px 0; }
  .btn { display: inline-block; background: #f59e0b; color: #000; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-weight: 700; font-size: 14px; }
  .footer { font-size: 12px; color: #6e7681; text-align: center; margin-top: 24px; }
</style></head>
<body>
<div class="container">
  <div class="card">
    <div class="logo">Fardax Store</div>
    <h1>⏰ Segera Bayar!</h1>
    <p>Hai ${name}, pesanan kamu (${orderNumber}) senilai <strong>Rp${amount.toLocaleString('id-ID')}</strong> belum dibayar.</p>
    <div class="warning">Batas waktu pembayaran: ${new Date(expiredAt).toLocaleString('id-ID')}</div>
    <a href="${APP_URL}/pembayaran/${orderId}" class="btn">Bayar Sekarang</a>
  </div>
  <div class="footer">© 2025 Fardax Store.</div>
</div>
</body>
</html>
    `.trim(),
  })
}
