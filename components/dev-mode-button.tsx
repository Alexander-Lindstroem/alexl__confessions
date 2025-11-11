'use client'

interface DevModeButtonProps {
  isEnabled: boolean
  onToggle: () => void
  onHoverStart?: () => void
  onHoverEnd?: () => void
}

export function DevModeButton({ isEnabled, onToggle, onHoverStart, onHoverEnd }: DevModeButtonProps) {
  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  return (
    <button
      onClick={onToggle}
      style={{
        position: 'fixed',
        top: '1rem',
        left: '1rem',
        padding: '0.5rem 1rem',
        fontSize: '0.85rem',
        fontWeight: '600',
        borderRadius: '0.5rem',
        border: `2px solid ${isEnabled ? '#10b981' : '#6b7280'}`,
        backgroundColor: isEnabled ? '#10b981' : '#6b7280',
        color: 'white',
        cursor: 'pointer',
        boxShadow: `0 2px 8px ${isEnabled ? 'rgba(16, 185, 129, 0.3)' : 'rgba(107, 114, 128, 0.3)'}`,
        transition: 'all 0.2s',
        zIndex: 1000,
      }}
      onMouseEnter={(e) => {
        onHoverStart?.()
        e.currentTarget.style.backgroundColor = isEnabled ? '#059669' : '#4b5563'
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.boxShadow = isEnabled
          ? '0 4px 12px rgba(16, 185, 129, 0.4)'
          : '0 4px 12px rgba(107, 114, 128, 0.4)'
      }}
      onMouseLeave={(e) => {
        onHoverEnd?.()
        e.currentTarget.style.backgroundColor = isEnabled ? '#10b981' : '#6b7280'
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = isEnabled
          ? '0 2px 8px rgba(16, 185, 129, 0.3)'
          : '0 2px 8px rgba(107, 114, 128, 0.3)'
      }}
    >
      Dev Mode: {isEnabled ? 'ON' : 'OFF'}
    </button>
  )
}
