import type { Metadata, Viewport } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-jakarta',
})

export const metadata: Metadata = {
  title: {
    template: '%s | Fardax Store',
    default: 'Fardax Store — Toko Digital Terpercaya',
  },
  description:
    'Fardax Store menyediakan layanan PPOB, Premium Apps, dan Social Media Services dengan harga terbaik, transaksi cepat, dan aman.',
  keywords: ['PPOB', 'Premium Apps', 'Social Media', 'Fardax Store', 'Topup', 'Digital'],
  authors: [{ name: 'Fardax Store' }],
  creator: 'Fardax Store',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'https://fardaxstore.com'),
  openGraph: {
    type: 'website',
    locale: 'id_ID',
    url: '/',
    title: 'Fardax Store — Toko Digital Terpercaya',
    description: 'PPOB, Premium Apps, dan Social Media Services dengan harga terbaik.',
    siteName: 'Fardax Store',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Fardax Store',
    description: 'PPOB, Premium Apps, dan Social Media Services.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  icons: {
    icon: [
      { url: '/logo.png', sizes: '512x512', type: 'image/png' },
      { url: '/logo.svg', type: 'image/svg+xml' },
    ],
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#090e1a' },
    { media: '(prefers-color-scheme: light)', color: '#f8f9fa' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var t = localStorage.getItem('fardax-theme');
                  document.documentElement.setAttribute('data-theme', t === 'dark' ? 'dark' : 'light');
                } catch(e) {
                  document.documentElement.setAttribute('data-theme', 'light');
                }
              })();
            `,
          }}
        />
      </head>
      <body className={`${jakarta.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  )
}
