'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, MailCheck, MessageCircle, AlertCircle, Loader2 } from 'lucide-react'

type Status = 'pending' | 'submitting' | 'verified' | 'error'
type Channel = 'EMAIL' | 'WA_OTP'

function VerifikasiContent() {
  const searchParams = useSearchParams()
  const emailParam = searchParams.get('email') ?? ''
  const [digits, setDigits] = useState<string[]>(Array(6).fill(''))
  const [status, setStatus] = useState<Status>('pending')
  const [errorMsg, setErrorMsg] = useState('')
  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)
  const [channel, setChannel] = useState<Channel>('EMAIL')
  const [twoStep, setTwoStep] = useState(false)
  const [stageNumber, setStageNumber] = useState(1)
  const inputsRef = useRef<(HTMLInputElement | null)[]>([])

  // Find out up front whether this account is on the two-step
  // (email then WhatsApp) verification mode, just for the UI's
  // "Langkah 1/2" indicator — actual gating always happens server-side.
  useEffect(() => {
    fetch('/api/auth/verification-method')
      .then((res) => res.json())
      .then((json) => {
        if (json?.success) {
          setTwoStep(json.method === 'EMAIL_AND_OTP')
          if (json.method === 'WA_OTP') setChannel('WA_OTP')
        }
      })
      .catch(() => {})
  }, [])

  function handleDigitChange(index: number, value: string) {
    const clean = value.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[index] = clean
    setDigits(next)
    if (clean && index < 5) inputsRef.current[index + 1]?.focus()
    if (clean && next.every((d) => d !== '') && status === 'pending') {
      void handleVerify(next.join(''))
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus()
    }
  }

  async function handleVerify(codeOverride?: string) {
    const code = codeOverride ?? digits.join('')
    if (code.length !== 6 || !emailParam) return
    setStatus('submitting')
    setErrorMsg('')
    try {
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailParam, code }),
      })
      const json = await res.json()
      if (json.success) {
        if (json.nextStep === 'WA_OTP') {
          // First factor done — automatically move to the second (WA) step.
          setChannel('WA_OTP')
          setStageNumber(2)
          setDigits(Array(6).fill(''))
          setStatus('pending')
          setResent(false)
          setErrorMsg('')
          inputsRef.current[0]?.focus()
        } else {
          setStatus('verified')
        }
      } else {
        setStatus('error')
        setErrorMsg(json.message ?? 'Kode salah atau kadaluarsa.')
      }
    } catch {
      setStatus('error')
      setErrorMsg('Terjadi kesalahan jaringan. Coba lagi.')
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!pasted) return
    e.preventDefault()
    const next = pasted.padEnd(6, '').split('').slice(0, 6)
    setDigits(next)
    inputsRef.current[Math.min(pasted.length, 5)]?.focus()
    if (pasted.length === 6 && status === 'pending') {
      void handleVerify(pasted)
    }
  }

  async function handleResend() {
    if (!emailParam) return
    setResending(true)
    setErrorMsg('')
    try {
      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailParam }),
      })
      const json = await res.json()
      if (json.success) {
        setResent(true)
        if (json.channel) setChannel(json.channel)
        setDigits(Array(6).fill(''))
        setStatus('pending')
        inputsRef.current[0]?.focus()
      } else {
        setErrorMsg(json.message ?? 'Gagal mengirim ulang kode.')
      }
    } catch {
      setErrorMsg('Terjadi kesalahan jaringan.')
    } finally {
      setResending(false)
    }
  }

  if (status === 'verified') {
    return (
      <div
        className="rounded-[20px] border p-8 text-center space-y-5"
        style={{ background: 'hsl(var(--background-card))', borderColor: 'hsl(var(--border))' }}
      >
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
          style={{ background: 'hsl(var(--success)/0.15)' }}
        >
          <CheckCircle className="h-8 w-8" style={{ color: 'hsl(var(--success))' }} />
        </div>
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'hsl(var(--foreground))' }}>
            Akun Terverifikasi!
          </h1>
          <p className="mt-2 text-sm" style={{ color: 'hsl(var(--foreground-muted))' }}>
            Akun kamu sudah aktif. Silakan masuk untuk mulai berbelanja.
          </p>
        </div>
        <Link
          href="/login"
          className="block w-full rounded-[12px] py-3 text-sm font-semibold text-center transition-all"
          style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}
        >
          Masuk Sekarang
        </Link>
      </div>
    )
  }

  return (
    <div
      className="rounded-[20px] border p-8 text-center space-y-5"
      style={{ background: 'hsl(var(--background-card))', borderColor: 'hsl(var(--border))' }}
    >
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
        style={{ background: 'hsl(var(--primary)/0.15)' }}
      >
        {channel === 'WA_OTP' ? (
          <MessageCircle className="h-8 w-8" style={{ color: 'hsl(var(--primary))' }} />
        ) : (
          <MailCheck className="h-8 w-8" style={{ color: 'hsl(var(--primary))' }} />
        )}
      </div>
      <div>
        {twoStep && (
          <p className="text-xs font-semibold mb-1 uppercase tracking-wide" style={{ color: 'hsl(var(--primary))' }}>
            Langkah {stageNumber} dari 2 — {channel === 'WA_OTP' ? 'Verifikasi WhatsApp' : 'Verifikasi Email'}
          </p>
        )}
        <h1 className="text-xl font-bold" style={{ color: 'hsl(var(--foreground))' }}>
          Masukkan Kode Verifikasi
        </h1>
        <p className="mt-2 text-sm" style={{ color: 'hsl(var(--foreground-muted))' }}>
          {emailParam ? (
            <>
              Kami mengirim kode 6 digit ke {channel === 'WA_OTP' ? 'WhatsApp Anda' : (
                <span className="font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
                  {emailParam}
                </span>
              )}
            </>
          ) : (
            'Buka link verifikasi dari email pendaftaran kamu untuk mendapatkan kode.'
          )}
        </p>
      </div>

      <div className="flex justify-center gap-2" onPaste={handlePaste}>
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => { inputsRef.current[i] = el }}
            value={d}
            onChange={(e) => handleDigitChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            inputMode="numeric"
            maxLength={1}
            disabled={status === 'submitting'}
            className="w-11 h-13 text-center text-xl font-bold rounded-[10px] border outline-none disabled:opacity-60"
            style={{
              background: 'hsl(var(--background-muted))',
              borderColor: 'hsl(var(--border))',
              color: 'hsl(var(--foreground))',
              height: '52px',
            }}
          />
        ))}
      </div>

      {status === 'submitting' && (
        <div className="flex items-center justify-center gap-2 text-sm" style={{ color: 'hsl(var(--foreground-muted))' }}>
          <Loader2 className="h-4 w-4 animate-spin" /> Memverifikasi...
        </div>
      )}

      {status === 'error' && errorMsg && (
        <div className="flex items-center justify-center gap-2 text-sm" style={{ color: 'hsl(var(--destructive))' }}>
          <AlertCircle className="h-4 w-4" /> {errorMsg}
        </div>
      )}

      {resent && (
        <p className="text-sm" style={{ color: 'hsl(var(--success))' }}>
          Kode baru sudah dikirim.
        </p>
      )}

      <div
        className="rounded-[12px] p-4 text-xs text-left space-y-1"
        style={{ background: 'hsl(var(--background-muted))', color: 'hsl(var(--foreground-muted))' }}
      >
        <p className="font-medium" style={{ color: 'hsl(var(--foreground))' }}>Tidak menerima kode?</p>
        {channel === 'WA_OTP' ? (
          <p>• Pastikan nomor WhatsApp Anda aktif dan terhubung ke bot</p>
        ) : (
          <p>• Periksa folder Spam atau Junk</p>
        )}
        <p>• Kode berlaku 10 menit sejak dikirim</p>
      </div>

      {emailParam && (
        <button
          onClick={handleResend}
          disabled={resending}
          className="w-full rounded-[12px] py-3 text-sm font-semibold border transition-all disabled:opacity-60"
          style={{
            borderColor: 'hsl(var(--border))',
            color: 'hsl(var(--foreground))',
            background: 'transparent',
          }}
        >
          {resending ? 'Mengirim...' : 'Kirim Ulang Kode'}
        </button>
      )}

      <p className="text-xs" style={{ color: 'hsl(var(--foreground-muted))' }}>
        Sudah punya akun?{' '}
        <Link href="/login" className="font-semibold" style={{ color: 'hsl(var(--primary))' }}>
          Masuk
        </Link>
      </p>
    </div>
  )
}

export default function VerifikasiPage() {
  return (
    <Suspense fallback={
      <div className="rounded-[20px] border p-10 text-center"
        style={{ background: 'hsl(var(--background-card))', borderColor: 'hsl(var(--border))' }}>
        <Loader2 className="h-10 w-10 animate-spin mx-auto" style={{ color: 'hsl(var(--primary))' }} />
      </div>
    }>
      <VerifikasiContent />
    </Suspense>
  )
}
