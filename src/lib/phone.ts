/**
 * Normalisasi & pencocokan nomor telepon Indonesia.
 *
 * Kenapa perlu ini: nomor HP bisa tersimpan di kolom `users.phone` dalam
 * beberapa format berbeda tergantung bagaimana usernya mengetik saat daftar
 * ("08123...", "8123...", "+628123...", "628123..."), sementara WhatsApp Bot
 * selalu mengirim nomor dalam format "628123..." (hasil normalisasi JID WA).
 *
 * Endpoint /api/checkout/bot dan /api/wallet/topup/bot sebelumnya melakukan
 * exact-match (`.eq('phone', phone)`) terhadap nomor dari bot — ini bikin
 * user yang daftar dengan format "08xxx" (paling umum) gagal ditemukan sama
 * sekali saat checkout/topup lewat bot, walau akunnya valid dan terdaftar.
 * Gunakan `phoneVariants()` + `.in('phone', variants)` untuk match yang benar.
 */

/** Hasilkan semua variasi format umum dari satu nomor telepon. */
export function phoneVariants(rawPhone: string): string[] {
  let d = String(rawPhone || '').replace(/\D/g, '')
  if (d.startsWith('62')) d = d.slice(2)
  if (d.startsWith('0')) d = d.slice(1)
  if (!d) return []
  return [d, '0' + d, '62' + d, '+62' + d]
}
