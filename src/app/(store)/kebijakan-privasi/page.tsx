import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Kebijakan Privasi — Fardax Store',
  description: 'Kebijakan privasi dan perlindungan data pengguna Fardax Store.',
}

const sections = [
  {
    title: '1. Informasi yang Kami Kumpulkan',
    content: `Kami mengumpulkan informasi berikut saat Anda menggunakan layanan Fardax Store:

• Informasi Akun: nama, alamat email, nomor telepon
• Informasi Transaksi: riwayat pembelian, nomor pesanan, metode pembayaran
• Informasi Teknis: alamat IP, jenis perangkat, browser, log akses
• Informasi yang Anda Berikan: nomor HP tujuan, ID game, atau data lain saat melakukan pembelian`,
  },
  {
    title: '2. Cara Kami Menggunakan Informasi',
    content: `Informasi yang kami kumpulkan digunakan untuk:

• Memproses dan menyelesaikan transaksi pembelian Anda
• Mengirimkan konfirmasi pesanan dan notifikasi status
• Mencegah penipuan dan aktivitas ilegal
• Meningkatkan layanan dan pengalaman pengguna
• Mengirimkan informasi promosi (hanya dengan persetujuan Anda)
• Memenuhi kewajiban hukum yang berlaku`,
  },
  {
    title: '3. Penyimpanan dan Keamanan Data',
    content: `Data Anda disimpan di server yang aman menggunakan enkripsi AES-256. Kami menerapkan langkah-langkah keamanan teknis dan organisasi untuk melindungi data Anda dari akses tidak sah, pengungkapan, atau perusakan.

Kredensial sensitif (seperti token akses) dienkripsi sebelum disimpan dan tidak pernah disimpan dalam bentuk teks biasa.`,
  },
  {
    title: '4. Berbagi Informasi dengan Pihak Ketiga',
    content: `Kami tidak menjual data pribadi Anda. Kami hanya berbagi data dengan:

• Provider layanan (OkeConnect, dll.) untuk memproses transaksi Anda
• Payment gateway (Casaku.id) untuk memproses pembayaran
• Layanan email untuk pengiriman notifikasi transaksi
• Pihak berwenang jika diwajibkan oleh hukum

Semua mitra pihak ketiga kami terikat oleh perjanjian kerahasiaan data.`,
  },
  {
    title: '5. Cookie dan Teknologi Pelacakan',
    content: `Kami menggunakan cookie yang diperlukan untuk fungsi autentikasi dan keamanan sesi. Kami tidak menggunakan cookie pelacakan pihak ketiga untuk keperluan iklan.`,
  },
  {
    title: '6. Hak Anda atas Data',
    content: `Anda memiliki hak untuk:

• Mengakses data pribadi yang kami miliki tentang Anda
• Memperbarui atau mengoreksi data yang tidak akurat
• Meminta penghapusan akun dan data Anda
• Menarik persetujuan untuk komunikasi pemasaran kapan saja

Untuk mengajukan permintaan, hubungi kami di privacy@fardaxstore.com`,
  },
  {
    title: '7. Retensi Data',
    content: `Kami menyimpan data transaksi selama 5 tahun untuk kepatuhan pajak dan audit. Data akun yang tidak aktif dapat dihapus setelah 2 tahun. Anda dapat meminta penghapusan lebih awal dengan menghubungi tim support kami.`,
  },
  {
    title: '8. Perubahan Kebijakan',
    content: `Kami dapat memperbarui kebijakan privasi ini dari waktu ke waktu. Perubahan signifikan akan diberitahukan melalui email atau notifikasi di aplikasi minimal 14 hari sebelum berlaku.`,
  },
  {
    title: '9. Hubungi Kami',
    content: `Jika Anda memiliki pertanyaan tentang kebijakan privasi ini atau cara kami menangani data Anda:

Email: privacy@fardaxstore.com
WhatsApp: +62-xxx-xxxx-xxxx
Jam kerja: Senin–Jumat, 09.00–17.00 WIB`,
  },
]

export default function KebijakanPrivasiPage() {
  return (
    <div className="min-h-screen py-8 px-4" style={{ background: 'hsl(var(--background))' }}>
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-2" style={{ color: 'hsl(var(--foreground))' }}>
            Kebijakan Privasi
          </h1>
          <p className="text-sm" style={{ color: 'hsl(var(--foreground-muted))' }}>
            Terakhir diperbarui: Januari 2025
          </p>
        </div>

        <div
          className="rounded-[20px] border p-5 mb-6"
          style={{
            background: 'hsl(var(--primary) / 0.08)',
            borderColor: 'hsl(var(--primary) / 0.3)',
          }}
        >
          <p className="text-sm" style={{ color: 'hsl(var(--foreground))' }}>
            Fardax Store berkomitmen untuk melindungi privasi dan keamanan data pengguna. Kebijakan ini menjelaskan bagaimana kami mengumpulkan, menggunakan, dan melindungi informasi Anda.
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
      </div>
    </div>
  )
}
