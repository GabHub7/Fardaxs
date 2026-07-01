export type ThemeName = 'light' | 'dark'

export const THEME_OPTIONS: { value: ThemeName; label: string; swatch: string }[] = [
  { value: 'light', label: 'Terang', swatch: '#f5f6f8' },
  { value: 'dark',  label: 'Gelap',  swatch: '#111318' },
]

export function getStoredTheme(): ThemeName {
  if (typeof window === 'undefined') return 'light'
  try {
    const t = localStorage.getItem('fardax-theme')
    return t === 'dark' ? 'dark' : 'light'
  } catch { return 'light' }
}

export function applyTheme(theme: ThemeName) {
  try {
    localStorage.setItem('fardax-theme', theme)
    document.documentElement.setAttribute('data-theme', theme)
  } catch {}
}
