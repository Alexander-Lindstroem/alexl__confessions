import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { parseConfessionSlug } from '@/lib/utils/slug'
import { getSeverityColor } from '@/lib/utils/severity'
import { BackButton } from '@/components/back-button'

interface ConfessionPageProps {
  params: Promise<{ slug: string }>
}

export default async function ConfessionPage({ params }: ConfessionPageProps) {
  const { slug } = await params
  const confessionId = parseConfessionSlug(slug)

  if (!confessionId) {
    notFound()
  }

  const supabase = await createClient()

  // Fetch the confession by ID
  const { data: confession, error } = await supabase
    .from('confessions')
    .select('*')
    .eq('id', confessionId)
    .single()

  if (error || !confession) {
    notFound()
  }

  // Format the date
  const createdDate = new Date(confession.created_at)
  const formattedDate = createdDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  // Get severity color
  const severityColor = getSeverityColor(confession.severity ?? 0)

  // Parse RGB values for gradient
  const rgbMatch = severityColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
  const [r, g, b] = rgbMatch ? [rgbMatch[1], rgbMatch[2], rgbMatch[3]] : ['100', '140', '200']
  const colorLight = `rgba(${r}, ${g}, ${b}, 0.25)`
  const colorMedium = `rgba(${r}, ${g}, ${b}, 0.55)`
  const colorStrong = `rgba(${r}, ${g}, ${b}, 0.85)`
  const colorFull = `rgba(${r}, ${g}, ${b}, 1)`

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        background: `
          radial-gradient(circle 600px at 20% 30%, rgba(139, 92, 246, 0.12) 0%, transparent 70%),
          radial-gradient(circle 700px at 80% 20%, rgba(59, 130, 246, 0.15) 0%, transparent 70%),
          radial-gradient(circle 500px at 40% 70%, rgba(168, 85, 247, 0.10) 0%, transparent 70%),
          radial-gradient(circle 650px at 90% 60%, rgba(96, 165, 250, 0.12) 0%, transparent 70%),
          radial-gradient(circle 550px at 10% 80%, rgba(147, 51, 234, 0.11) 0%, transparent 70%),
          radial-gradient(circle 600px at 60% 90%, rgba(79, 70, 229, 0.14) 0%, transparent 70%),
          #ffffff
        `,
      }}
    >
      {/* Back button */}
      <BackButton />

      {/* Confession display */}
      <div
        style={{
          maxWidth: '800px',
          width: '100%',
          borderRadius: '2rem',
          background: `
            radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0.2) 15%, transparent 40%),
            radial-gradient(circle at center, transparent 0%, transparent 45%, ${colorLight} 65%, ${colorMedium} 80%, ${colorStrong} 95%, ${colorFull} 100%)
          `,
          padding: '3rem',
          boxShadow: `0 8px 32px ${colorLight}`,
          position: 'relative',
        }}
      >
        {/* Overlay for depth effect */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            borderRadius: '2rem',
            background: `radial-gradient(circle at center, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0.1) 50%, transparent 70%)`,
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />

        {/* Content */}
        <div style={{ position: 'relative', zIndex: 2 }}>
          <p
            style={{
              fontSize: '1.5rem',
              lineHeight: '1.8',
              color: '#1f2937',
              marginBottom: '2rem',
              textAlign: 'center',
              mixBlendMode: 'multiply',
            }}
          >
            {confession['text-content']}
          </p>

          <div
            style={{
              fontSize: '0.875rem',
              color: '#6b7280',
              textAlign: 'center',
              paddingTop: '1.5rem',
              borderTop: `1px solid ${colorLight}`,
            }}
          >
            Confessed on {formattedDate}
          </div>
        </div>
      </div>
    </div>
  )
}
