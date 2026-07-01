import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Syarat & Ketentuan — Fardax Store',
  description: 'Syarat dan ketentuan penggunaan layanan Fardax Store.',
}

const sections = [
  {
    title: '1. Penerimaan Syarat',
    content: `Dengan mengakses dan menggunakan layanan Fardax Store, Anda menyetujui untuk terikat oleh syarat dan ketentuan ini. Jika Anda tidak menyetujui syarat ini, harap tidak menggunakan layanan kami.`,
  },
  {
    title: '2. Layanan yang Disediakan',
    content: `Fardax Store menyediakan platform pembelian produk digital meliputi:
• Pulsa dan paket data seluruh operator
• Token listrik PLN dan tagihan utilitas
• Voucher game dan produk digital
• Layanan PPOB (Payment Point Online Bank)
• Produk premium apps dan langganan digital`,
  },
  {
    title: '3. Akun Pengguna',
    content: `Anda bertanggung jawab untuk menjaga kerahasiaan informasi akun Anda. Kami tidak bertanggung jawab atas kerugian yang timbul akibat penggunaan akun Anda oleh pihak lain. Segera hubungi kami jika Anda mencurigai akun Anda telah disalahgunakan.`,
  },
  {
    title: '4. Pemesanan dan Pembayaran',
    content: `Setiap pesanan yang telah dibayar akan segera diproses. Pembayaran yang telah dilakukan tidak dapat dibatalkan kecuali dalam kondisi tertentu seperti kesalahan sistem atau produk tidak tersedia. Harga yang tertera adalah harga final termasuk biaya transaksi.`,
  },
  {
    title: '5. Pengiriman dan Fulfillment',
    content: `Produk digital akan dikirimkan secara otomatis ke nomor/akun yang Anda masukkan saat pemesanan. Waktu pengiriman umumnya instan hingga 5 menit. Untuk keterlambatan yang disebabkan oleh gangguan operator atau provider, kami akan memproses ulang atau memberikan refund.`,
  },
  {
    title: '6. Kebijakan Refund',
    content: `Refund dapat diajukan dalam kondisi:
• Produk tidak terkirim dalam 24 jam setelah pembayaran
• Terjadi kesalahan sistem dari pihak Fardax Store
• Nomor/akun tujuan yang dimasukkan tidak valid (diverifikasi oleh sistem)

Refund tidak dapat diproses jika kesalahan disebabkan oleh data yang Anda masukkan (nomor HP, ID game, dll.).`,
  },
  {
    title: '7. Larangan Penggunaan',
    content: `Anda dilarang menggunakan layanan kami untuk:
• Melakukan pembelian dengan informasi pembayaran curian
• Melakukan penipuan atau kegiatan ilegal
• Menjual kembali produk tanpa izin (kecuali program reseller resmi)
• Mengakses sistem kami dengan cara yang tidak sah`,
  },
  {
    title: '8. Batasan Tanggung Jawab',
    content: `Fardax Store tidak bertanggung jawab atas kerugian tidak langsung yang timbul dari penggunaan layanan kami. Tanggung jawab kami terbatas pada nilai transaksi yang bermasalah.`,
  },
  {
    title: '9. Perubahan Syarat',
    content: `Kami berhak mengubah syarat dan ketentuan ini kapan saja. Perubahan akan berlaku efektif setelah dipublikasikan di situs ini. Penggunaan layanan Anda setelah perubahan tersebut merupakan penerimaan atas syarat yang baru.`,
  },
  {
    title: '10. Hukum yang Berlaku',
    content: `Syarat dan ketentuan ini diatur oleh hukum Republik Indonesia. Segala sengketa akan diselesaikan melalui musyawarah, dan jika tidak tercapai kesepakatan, akan diselesaikan di pengadilan yang berwenang di Indonesia.`,
  },
]

export default function SyaratKetentuanPage() {
  return (
    <div className="min-h-screen py-8 px-4" style={{ background: 'hsl(var(--background))' }}>
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-2" style={{ color: 'hsl(var(--foreground))' }}>
            Syarat &amp; Ketentuan
          </h1>
          <p className="text-sm" style={{ color: 'hsl(var(--foreground-muted))' }}>
            Terakhir diperbarui: Januari 2025
          </p>
        </div>

        <div className="space-y-6">
          {sections.map((section) => (
            <div
              key={section.title}
              className="rounded-[20px] border p-6"
              style={{
                background: 'hsl(var(--background-card))',
                borderColor: 'hsl(var(--border))',
              }}
            >
              <h2 className="text-base font-semibold mb-3" style={{ color: 'hsl(var(--foreground))' }}>
                {section.title}
              </h2>
              <p
                className="text-sm leading-relaxed whitespace-pre-line"
                style={{ color: 'hsl(var(--foreground-muted))' }}
              >
                {section.content}
              </p>
            </div>
          ))}
        </div>

        <div
          className="mt-8 rounded-[20px] border p-6 text-center"
          style={{ background: 'hsl(var(--background-card))', borderColor: 'hsl(var(--border))' }}
        >
          <p className="text-sm" style={{ color: 'hsl(var(--foreground-muted))' }}>
            Ada pertanyaan? Hubungi kami di{' '}
            <a
              href="mailto:cs@fardaxstore.com"
              className="font-medium"
              style={{ color: 'hsl(var(--primary))' }}
            >
              cs@fardaxstore.com
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
