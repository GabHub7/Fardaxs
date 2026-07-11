import { z } from 'zod'

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email wajib diisi')
    .email('Format email tidak valid'),
  password: z
    .string()
    .min(1, 'Password wajib diisi'),
})

export const registerSchema = z
  .object({
    full_name: z
      .string()
      .min(2, 'Nama minimal 2 karakter')
      .max(100, 'Nama maksimal 100 karakter'),
    email: z
      .string()
      .min(1, 'Email wajib diisi')
      .email('Format email tidak valid'),
    phone: z
      .string()
      .trim()
      .optional()
      .refine((val) => !val || /^\+?[0-9]{9,15}$/.test(val), 'Format nomor WhatsApp tidak valid'),
    password: z
      .string()
      .min(8, 'Password minimal 8 karakter')
      .regex(/[A-Z]/, 'Password harus memiliki huruf kapital')
      .regex(/[a-z]/, 'Password harus memiliki huruf kecil')
      .regex(/[0-9]/, 'Password harus memiliki angka')
      .refine(
        (val) => !['12345678', 'password', 'qwerty', 'admin123', 'store123', 'fardax123'].includes(val),
        'Password terlalu umum'
      ),
    confirm_password: z.string().min(1, 'Konfirmasi password wajib diisi'),
    agree_terms: z
      .boolean()
      .refine((val) => val === true, 'Anda harus menyetujui syarat dan ketentuan'),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: 'Password tidak cocok',
    path: ['confirm_password'],
  })

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'Email wajib diisi')
    .email('Format email tidak valid'),
})

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Password minimal 8 karakter')
      .regex(/[A-Z]/, 'Password harus memiliki huruf kapital')
      .regex(/[a-z]/, 'Password harus memiliki huruf kecil')
      .regex(/[0-9]/, 'Password harus memiliki angka'),
    confirm_password: z.string().min(1, 'Konfirmasi password wajib diisi'),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: 'Password tidak cocok',
    path: ['confirm_password'],
  })

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
