'use client'

import Link from 'next/link'

export function BackButton() {
  return (
    <Link
      href="/"
      style={{
        position: 'fixed',
        top: '2rem',
        left: '2rem',
        padding: '0.75rem 1.5rem',
        fontSize: '1rem',
        fontWeight: '600',
        borderRadius: '2rem',
        border: '2px solid rgba(139, 92, 246, 0.3)',
        backgroundColor: 'white',
        color: '#1f2937',
        textDecoration: 'none',
        boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)',
        transition: 'all 0.2s',
        zIndex: 1000,
        display: 'inline-block',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 6px 16px rgba(139, 92, 246, 0.4)'
        e.currentTarget.style.transform = 'translateY(-2px)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(139, 92, 246, 0.3)'
        e.currentTarget.style.transform = 'translateY(0)'
      }}
    >
      ← Back to Confessions
    </Link>
  )
}
