'use client'

import { useState } from 'react'

interface InfoButtonProps {
  onHoverStart?: () => void
  onHoverEnd?: () => void
}

export function InfoButton({ onHoverStart, onHoverEnd }: InfoButtonProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* Info Button */}
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed',
          top: '2rem',
          right: '2rem',
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          border: '2px solid rgba(139, 92, 246, 0.3)',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          color: '#8b5cf6',
          fontSize: '1.5rem',
          fontWeight: 'bold',
          fontStyle: 'italic',
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          transition: 'all 0.2s',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onMouseEnter={(e) => {
          onHoverStart?.()
          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 1)'
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(139, 92, 246, 0.3)'
          e.currentTarget.style.transform = 'scale(1.05)'
        }}
        onMouseLeave={(e) => {
          onHoverEnd?.()
          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.9)'
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)'
          e.currentTarget.style.transform = 'scale(1)'
        }}
        aria-label="Information"
      >
        i
      </button>

      {/* Info Modal */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '1rem',
          }}
          onClick={() => setIsOpen(false)}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '1rem',
              padding: '2rem',
              maxWidth: '500px',
              width: '100%',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                color: '#1f2937',
                marginBottom: '1.5rem',
                textAlign: 'center',
              }}
            >
              Privacy Information
            </h2>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1.25rem',
                color: '#374151',
                fontSize: '0.95rem',
                lineHeight: '1.6',
              }}
            >
              <div>
                <div
                  style={{
                    fontWeight: '600',
                    color: '#8b5cf6',
                    marginBottom: '0.5rem',
                  }}
                >
                  Anonymous Confessions
                </div>
                <p style={{ margin: 0 }}>
                  Every confession made is completely anonymous and cannot be directly connected to the
                  user who created it. Your identity remains private.
                </p>
              </div>

              <div>
                <div
                  style={{
                    fontWeight: '600',
                    color: '#8b5cf6',
                    marginBottom: '0.5rem',
                  }}
                >
                  24-Hour Data Deletion
                </div>
                <p style={{ margin: 0 }}>
                  User data is anonymous and automatically deleted every 24 hours. No long-term tracking
                  or storage of user information.
                </p>
              </div>

              <div>
                <div
                  style={{
                    fontWeight: '600',
                    color: '#8b5cf6',
                    marginBottom: '0.5rem',
                  }}
                >
                  Transparent Data Collection
                </div>
                <p style={{ margin: 0 }}>
                  No data is being collected aside from what you can see on the screen. Only confession
                  text and severity ratings are stored.
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              style={{
                marginTop: '2rem',
                width: '100%',
                padding: '0.75rem',
                fontSize: '1rem',
                fontWeight: '600',
                borderRadius: '0.5rem',
                border: 'none',
                backgroundColor: '#8b5cf6',
                color: 'white',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#7c3aed'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#8b5cf6'
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  )
}
