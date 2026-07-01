import { Music, Play, Sparkles, Brain, Clapperboard } from 'lucide-react'

interface LogoSpec {
  bg: string
  icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number; color?: string }>
  iconColor: string
  letter?: string
}

// Simple, brand-colored glyphs — not reproductions of the actual trademarked
// logos, just enough visual identity to recognize the product at a glance.
const LOGOS: Record<string, LogoSpec> = {
  netflix: { bg: '#1A0E0E', icon: Play, iconColor: '#E50914', letter: 'N' },
  spotify: { bg: '#0E1F16', icon: Music, iconColor: '#1DB954' },
  youtube: { bg: '#1A0E0E', icon: Play, iconColor: '#FF0000' },
  canva: { bg: '#0E1A1F', icon: Sparkles, iconColor: '#00C4CC' },
  chatgpt: { bg: '#0E1A18', icon: Brain, iconColor: '#10A37F' },
  disney: { bg: '#0E1525', icon: Clapperboard, iconColor: '#01153C' },
}

function keyFromImageUrl(imageUrl: string | null | undefined): string | null {
  if (!imageUrl) return null
  const match = imageUrl.match(/^logo:(.+)$/)
  return match ? match[1] : null
}

interface ProductLogoProps {
  imageUrl: string | null | undefined
  name: string
  size?: number
  className?: string
}

/** Renders a brand-colored product glyph for known `logo:<slug>` image_url
 *  values, or a plain letter avatar as a fallback for real uploaded images
 *  we don't have a special treatment for. */
export function ProductLogo({ imageUrl, name, size = 48, className }: ProductLogoProps) {
  const key = keyFromImageUrl(imageUrl)
  const spec = key ? LOGOS[key] : undefined

  if (spec) {
    const Icon = spec.icon
    return (
      <div
        className={`flex items-center justify-center rounded-2xl shrink-0 ${className ?? ''}`}
        style={{ width: size, height: size, background: spec.bg }}
      >
        {spec.letter ? (
          <span
            className="font-black"
            style={{ color: spec.iconColor, fontSize: size * 0.42 }}
          >
            {spec.letter}
          </span>
        ) : (
          <Icon size={size * 0.46} color={spec.iconColor} strokeWidth={2.2} />
        )}
      </div>
    )
  }

  // Fallback: first letter of the product name on a neutral dark tile —
  // used once admins start uploading their own product images.
  return (
    <div
      className={`flex items-center justify-center rounded-2xl shrink-0 bg-cover bg-center ${className ?? ''}`}
      style={{
        width: size,
        height: size,
        background: imageUrl ? `#111827 url(${imageUrl}) center/cover` : '#1A2235',
      }}
    >
      {!imageUrl && (
        <span className="font-bold text-white/70" style={{ fontSize: size * 0.4 }}>
          {name.charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  )
}
