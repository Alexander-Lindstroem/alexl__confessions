'use client'

import { useState } from 'react'
import { submitConfession } from '@/lib/actions/confessions'

interface ConfessionModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  devMode?: boolean
}

export function ConfessionModal({ isOpen, onClose, onSuccess, devMode = false }: ConfessionModalProps) {
  const [content, setContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const characterCount = content.length
  const maxCharacters = 300
  const isOverLimit = characterCount > maxCharacters

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!content.trim()) {
      setError('Please write a confession')
      return
    }

    if (isOverLimit) {
      setError('Confession is too long')
      return
    }

    setIsSubmitting(true)

    try {
      const result = await submitConfession(content, devMode)

      if (result.success) {
        setContent('')
        onSuccess()
        onClose()
      } else {
        setError(result.error || 'Failed to submit confession')
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      setContent('')
      setError(null)
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
        padding: '1rem',
      }}
      onClick={handleClose}
    >
      <div
        style={{
          backgroundColor: 'var(--background)',
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
            fontWeight: '600',
            marginBottom: '1.5rem',
            color: 'var(--foreground)',
          }}
        >
          Write your confession
        </h2>

        <form onSubmit={handleSubmit}>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Type your confession here..."
            disabled={isSubmitting}
            style={{
              width: '100%',
              minHeight: '150px',
              padding: '1rem',
              fontSize: '1rem',
              borderRadius: '0.5rem',
              border: `2px solid ${isOverLimit ? '#ef4444' : 'var(--bubble-border)'}`,
              backgroundColor: 'var(--bubble-bg)',
              color: 'var(--foreground)',
              resize: 'vertical',
              fontFamily: 'inherit',
              outline: 'none',
              transition: 'border-color 0.2s',
            }}
            onFocus={(e) => {
              if (!isOverLimit) {
                e.target.style.borderColor = '#3b82f6'
              }
            }}
            onBlur={(e) => {
              if (!isOverLimit) {
                e.target.style.borderColor = 'var(--bubble-border)'
              }
            }}
          />

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '0.5rem',
              marginBottom: '1rem',
            }}
          >
            <span
              style={{
                fontSize: '0.875rem',
                color: isOverLimit ? '#ef4444' : '#999',
              }}
            >
              {characterCount} / {maxCharacters} characters
            </span>
          </div>

          {error && (
            <div
              style={{
                padding: '0.75rem',
                backgroundColor: '#fee',
                color: '#c00',
                borderRadius: '0.5rem',
                marginBottom: '1rem',
                fontSize: '0.875rem',
              }}
            >
              {error}
            </div>
          )}

          <div
            style={{
              display: 'flex',
              gap: '1rem',
              justifyContent: 'flex-end',
            }}
          >
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              style={{
                padding: '0.75rem 1.5rem',
                fontSize: '1rem',
                borderRadius: '0.5rem',
                border: '2px solid var(--bubble-border)',
                backgroundColor: 'transparent',
                color: 'var(--foreground)',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                opacity: isSubmitting ? 0.5 : 1,
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                if (!isSubmitting) {
                  e.currentTarget.style.backgroundColor = 'var(--bubble-bg)'
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent'
              }}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting || !content.trim() || isOverLimit}
              style={{
                padding: '0.75rem 1.5rem',
                fontSize: '1rem',
                borderRadius: '0.5rem',
                border: 'none',
                backgroundColor:
                  isSubmitting || !content.trim() || isOverLimit ? '#ccc' : '#3b82f6',
                color: 'white',
                cursor:
                  isSubmitting || !content.trim() || isOverLimit ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                if (!isSubmitting && content.trim() && !isOverLimit) {
                  e.currentTarget.style.backgroundColor = '#2563eb'
                }
              }}
              onMouseLeave={(e) => {
                if (!isSubmitting && content.trim() && !isOverLimit) {
                  e.currentTarget.style.backgroundColor = '#3b82f6'
                }
              }}
            >
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
