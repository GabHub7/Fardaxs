import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'

export const metadata: Metadata = {
  title: {
    template: '%s | Fardax Store',
    default: 'Masuk | Fardax Store',
  },
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background:
          'radial-gradient(1100px 500px at 15% -5%, rgba(37,99,235,0.10), transparent 60%), radial-gradient(1000px 520px at 100% 0%, rgba(236,72,153,0.10), transparent 55%), hsl(var(--background))',
      }}
    >
      {/* Header */}
      <header
        className="flex items-center justify-center py-6 border-b"
        style={{ borderColor: 'hsl(var(--border))' }}
      >
        <Link href="/" className="flex items-center gap-2.5">
          <Image src="/logo.png" alt="Fardax Store" width={36} height={36} priority style={{ objectFit: 'contain' }} />
          <span className="brand-wordmark text-lg">
            FardaxStore
          </span>
        </Link>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">{children}</div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center">
        <p className="text-sm" style={{ color: 'hsl(var(--foreground-muted))' }}>
          © 2025 Fardax Store. Semua hak dilindungi.
        </p>
      </footer>
    </div>
  )
}
