'use client'

import { useEffect, useState } from 'react'

interface ConfessionTimerProps {
  onHoverStart?: () => void
  onHoverEnd?: () => void
}

export function ConfessionTimer({ onHoverStart, onHoverEnd }: ConfessionTimerProps) {
  const [timeLeft, setTimeLeft] = useState<string>('')
  const [isHovered, setIsHovered] = useState(false)

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date()
      const utcNow = new Date(now.toUTCString())

      // Calculate next midnight UTC
      const nextMidnight = new Date(utcNow)
      nextMidnight.setUTCHours(24, 0, 0, 0)

      const diff = nextMidnight.getTime() - utcNow.getTime()

      // Calculate hours, minutes, seconds
      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      setTimeLeft(`${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`)
    }

    // Update immediately
    updateTimer()

    // Update every second
    const interval = setInterval(updateTimer, 1000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div
      onMouseEnter={() => {
        setIsHovered(true)
        onHoverStart?.()
      }}
      onMouseLeave={() => {
        setIsHovered(false)
        onHoverEnd?.()
      }}
      style={{
        position: 'fixed',
        bottom: '0',
        left: '50%',
        transform: 'translateX(-50%)',
        padding: isHovered ? '1.5rem 2.5rem' : '0.75rem 1.5rem',
        fontSize: '1rem',
        fontWeight: '600',
        borderTopLeftRadius: '1rem',
        borderTopRightRadius: '1rem',
        borderBottomLeftRadius: '0',
        borderBottomRightRadius: '0',
        border: '2px solid rgba(139, 92, 246, 0.3)',
        borderBottom: 'none',
        backgroundColor: 'white',
        color: '#1f2937',
        boxShadow: '0 -4px 12px rgba(139, 92, 246, 0.2)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: isHovered ? '0.5rem' : '0',
        minWidth: isHovered ? '280px' : 'auto',
        transition: 'all 0.3s ease',
        cursor: 'default',
      }}
    >
      {isHovered && (
        <div style={{ fontSize: '0.875rem', opacity: 0.7, transition: 'opacity 0.3s ease' }}>
          You've already confessed today
        </div>
      )}
      <div style={{ fontSize: isHovered ? '1.5rem' : '1.25rem', fontWeight: '700', fontFamily: 'monospace', transition: 'font-size 0.3s ease' }}>
        {timeLeft}
      </div>
      {isHovered && (
        <div style={{ fontSize: '0.75rem', opacity: 0.6, transition: 'opacity 0.3s ease' }}>
          Until you can confess again
        </div>
      )}
    </div>
  )
}
