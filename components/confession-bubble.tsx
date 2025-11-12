'use client'

import { useRouter } from 'next/navigation'
import type { Tables } from '@/types/database'
import { getSeverityColor } from '@/lib/utils/severity'
import { generateConfessionSlug } from '@/lib/utils/slug'

type Confession = Tables<'confessions'>

interface ConfessionBubbleProps {
  confession: Confession
  style?: React.CSSProperties
}

export function ConfessionBubble({ confession, style }: ConfessionBubbleProps) {
  const router = useRouter()

  // Get color based on severity (defaults to blue if severity is 0 or null)
  const severityColor = getSeverityColor(confession.severity ?? 0)

  // Parse RGB values from the color string (e.g., "rgb(100, 140, 200)")
  const rgbMatch = severityColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
  const [r, g, b] = rgbMatch ? [rgbMatch[1], rgbMatch[2], rgbMatch[3]] : ['100', '140', '200']

  // Create rgba versions with different opacities
  const colorLight = `rgba(${r}, ${g}, ${b}, 0.25)`
  const colorMedium = `rgba(${r}, ${g}, ${b}, 0.55)`
  const colorStrong = `rgba(${r}, ${g}, ${b}, 0.85)`
  const colorFull = `rgba(${r}, ${g}, ${b}, 1)`

  // Handle click to navigate to confession page
  const handleClick = () => {
    const slug = generateConfessionSlug(confession.id, confession['text-content'])
    router.push(`/confession/${slug}`)
  }

  return (
    <div
      className="confession-bubble"
      onClick={handleClick}
      style={{
        width: '280px',
        height: '280px',
        borderRadius: '50%',
        background: `
          radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0.2) 15%, transparent 40%),
          radial-gradient(circle at center, transparent 0%, transparent 45%, ${colorLight} 65%, ${colorMedium} 80%, ${colorStrong} 95%, ${colorFull} 100%)
        `,
        border: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem',
        cursor: 'pointer',
        transition: 'box-shadow 0.2s ease, filter 0.2s ease',
        boxShadow: `0 4px 16px ${colorLight}`,
        ...style,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = `0 8px 24px ${colorMedium}`
        e.currentTarget.style.filter = 'brightness(1.05)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = `0 4px 16px ${colorLight}`
        e.currentTarget.style.filter = 'brightness(1)'
      }}
    >
      <div
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          background: `radial-gradient(circle at center, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0.1) 50%, transparent 70%)`,
          pointerEvents: 'none',
          zIndex: 2,
        }}
      />
      <p
        style={{
          fontFamily: 'var(--font-quicksand), sans-serif',
          fontWeight: 500,
          fontSize: '0.95rem',
          lineHeight: '1.6',
          textAlign: 'center',
          color: '#1f2937',
          wordWrap: 'break-word',
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 7,
          WebkitBoxOrient: 'vertical',
          position: 'relative',
          zIndex: 1,
          mixBlendMode: 'multiply',
        }}
      >
        {confession['text-content']}
      </p>
    </div>
  )
}
