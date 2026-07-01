'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'

interface UpdateProfileResult {
  success: boolean
  message: string
}

export async function updateProfileAction(
  full_name: string,
  phone: string,
): Promise<UpdateProfileResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, message: 'Sesi tidak valid. Silakan masuk kembali.' }
  }

  const trimmedName = full_name.trim()
  const trimmedPhone = phone.trim()

  if (!trimmedName) {
    return { success: false, message: 'Nama lengkap tidak boleh kosong.' }
  }

  if (trimmedName.length > 100) {
    return { success: false, message: 'Nama lengkap terlalu panjang (maks. 100 karakter).' }
  }

  if (trimmedPhone && !/^(\+62|62|0)[0-9]{8,13}$/.test(trimmedPhone.replace(/[\s-]/g, ''))) {
    return { success: false, message: 'Format nomor telepon tidak valid. Contoh: 08123456789' }
  }

  const serviceClient = createServiceClient()

  const { error } = await serviceClient
    .from('users')
    .update({
      full_name: trimmedName,
      phone: trimmedPhone || null,
      updated_at: new Date().toISOString(),
    })
    .eq('auth_id', user.id)

  if (error) {
    console.error('updateProfileAction error:', error.message)
    return { success: false, message: 'Gagal memperbarui profil. Coba lagi.' }
  }

  revalidatePath('/akun')
  revalidatePath('/akun/profil')

  return { success: true, message: 'Profil berhasil diperbarui!' }
}
