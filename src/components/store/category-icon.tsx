import {
  Smartphone, Wifi, Zap, Droplet, Users, Tv, Globe, Wallet,
  Gamepad2, Building2, ShoppingBag, Plane, Train, Hotel, ShieldCheck, MoreHorizontal,
  Play, Palette, Cloud, Sparkles, Heart,
} from 'lucide-react'

const ICONS: Record<string, React.ComponentType<{ size?: number; className?: string; strokeWidth?: number; color?: string }>> = {
  ppob: Zap,
  streaming: Play,
  design: Palette,
  cloud: Cloud,
  'ai-tools': Sparkles,
  game: Gamepad2,
  'social-media': Heart,
  'e-wallet': Wallet,
  pulsa: Smartphone,
  'paket-data': Wifi,
  'pln-token': Zap,
  pdam: Droplet,
  bpjs: Users,
  telkom: Globe,
  'tv-kabel': Tv,
  internet: Globe,
  angsuran: Building2,
  pajak: ShoppingBag,
  asuransi: ShieldCheck,
  hotel: Hotel,
  'tiket-kereta': Train,
  'tiket-pesawat': Plane,
}

interface CategoryIconProps {
  slug: string
  color?: string | null
  size?: number
  className?: string
}

export function CategoryIcon({ slug, color, size = 22, className }: CategoryIconProps) {
  const Icon = ICONS[slug] ?? MoreHorizontal
  return <Icon size={size} className={className} color={color ?? '#3B82F6'} strokeWidth={2} />
}
