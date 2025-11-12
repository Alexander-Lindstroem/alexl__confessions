'use client'

import { useEffect, useState, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useDrag } from '@use-gesture/react'
import { createClient } from '@/lib/supabase/client'
import { ConfessionBubble } from './confession-bubble'
import { ConfessionModal } from './confession-modal'
import { ConfessionTimer } from './confession-timer'
import { DevModeButton } from './dev-mode-button'
import { InfoButton } from './info-button'
import type { Tables } from '@/types/database'

type Confession = Tables<'confessions'>

interface Position {
  x: number
  y: number
}

export function ConfessionCanvas() {
  const supabase = createClient()
  const queryClient = useQueryClient()
  const [offset, setOffset] = useState<Position>({ x: 0, y: 0 })
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [devModeEnabled, setDevModeEnabled] = useState(false)
  const [isPanningPaused, setIsPanningPaused] = useState(false)
  const canvasRef = useRef<HTMLDivElement>(null)
  const animationFrameRef = useRef<number | undefined>(undefined)
  // Store positions by confession ID to maintain stability
  const positionsMapRef = useRef<Map<number, Position>>(new Map())
  const [positions, setPositions] = useState<Map<number, Position>>(new Map())
  // Track which confessions have been rendered at least once
  const hasRenderedRef = useRef<Set<number>>(new Set())

  // Fetch confessions from Supabase
  const { data: confessions, isLoading, error } = useQuery({
    queryKey: ['confessions'],
    queryFn: async () => {
      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser()
      console.log('Current user:', user)

      const { data, error } = await supabase
        .from('confessions')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching confessions:', error)
        throw error
      }

      console.log('Fetched confessions:', data)
      return data as Confession[]
    },
  })

  // Fetch current user's confessed status
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error) {
        console.error('Error fetching user:', error)
        return null
      }

      return data
    },
  })

  // Log any query errors
  useEffect(() => {
    if (error) {
      console.error('Query error:', error)
    }
  }, [error])

  // Handle confession positioning with collision detection
  useEffect(() => {
    if (!confessions || confessions.length === 0) return

    const newPositions = new Map(positionsMapRef.current)
    const bubbleSize = 280
    const minDistance = bubbleSize + 40
    const spiralSpacing = 150

    // Seeded random number generator (Mulberry32)
    const seededRandom = (seed: number) => {
      return () => {
        let t = (seed += 0x6d2b79f5)
        t = Math.imul(t ^ (t >>> 15), t | 1)
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
      }
    }

    // Create a hash from user_id (UUID) to use as seed
    const hashUserId = (userId: string): number => {
      let hash = 0
      for (let i = 0; i < userId.length; i++) {
        const char = userId.charCodeAt(i)
        hash = (hash << 5) - hash + char
        hash = hash & hash // Convert to 32bit integer
      }
      return Math.abs(hash)
    }

    // Get seed from current user's user_id
    const seed = currentUser?.user_id ? hashUserId(currentUser.user_id) : 12345
    const random = seededRandom(seed)

    // Helper to check collision between two positions
    const getDistance = (pos1: Position, pos2: Position) => {
      return Math.sqrt((pos1.x - pos2.x) ** 2 + (pos1.y - pos2.y) ** 2)
    }

    // Helper to push a confession away from a point
    const pushAway = (fromPos: Position, targetPos: Position, minDist: number): Position => {
      const dx = targetPos.x - fromPos.x
      const dy = targetPos.y - fromPos.y
      const distance = Math.sqrt(dx * dx + dy * dy)

      if (distance === 0) {
        // If exactly at the same position, push in a random direction
        const angle = Math.random() * Math.PI * 2
        return {
          x: targetPos.x + Math.cos(angle) * minDist,
          y: targetPos.y + Math.sin(angle) * minDist,
        }
      }

      if (distance < minDist) {
        // Push apart to maintain minimum distance
        const nx = dx / distance
        const ny = dy / distance
        const pushDistance = (minDist - distance) / 2 // Split the push between both
        return {
          x: targetPos.x + nx * pushDistance,
          y: targetPos.y + ny * pushDistance,
        }
      }

      return targetPos
    }

    // Generate initial spiral position for confessions without positions
    const centerX = typeof window !== 'undefined' ? window.innerWidth / 2 : 800
    const centerY = typeof window !== 'undefined' ? window.innerHeight / 2 : 600

    // Track the newly added confession (if any)
    let newConfessionId: number | null = null

    let confessionsNeedingPositions: Confession[] = []

    // Separate confessions by validity (severity 0 = invalid, ≥1 = valid)
    const validConfessions = confessions.filter((c) => (c.severity ?? 0) >= 1)
    const invalidConfessions = confessions.filter((c) => (c.severity ?? 0) === 0)

    // Sort: valid confessions first (center), then invalid (edges)
    const sortedConfessions = [...validConfessions, ...invalidConfessions]

    sortedConfessions.forEach((confession, sortedIndex) => {
      if (!newPositions.has(confession.id)) {
        confessionsNeedingPositions.push(confession)

        // Check if this is a new confession (just added) by seeing if it's the first one
        const originalIndex = confessions.findIndex((c) => c.id === confession.id)
        const isNewConfession = originalIndex === 0 && confessions.length > positionsMapRef.current.size

        if (isNewConfession) {
          newConfessionId = confession.id
          // New confession - place at viewport center in world coordinates
          const viewportCenterX = typeof window !== 'undefined' ? window.innerWidth / 2 : 800
          const viewportCenterY = typeof window !== 'undefined' ? window.innerHeight / 2 : 600

          newPositions.set(confession.id, {
            x: viewportCenterX - offset.x,
            y: viewportCenterY - offset.y,
          })
        } else {
          // Existing confession on first load - use randomized spiral layout
          // Use sorted index for spiral positioning (valid confessions get lower indices = closer to center)
          const baseAngle = (sortedIndex * 137.5 * Math.PI) / 180 // Golden angle
          const baseDistance = Math.sqrt(sortedIndex) * spiralSpacing

          // Add random variations (deterministic based on user_id)
          const angleVariation = (random() - 0.5) * Math.PI * 0.3 // ±27 degrees
          const distanceVariation = (random() - 0.5) * spiralSpacing * 0.4

          const angle = baseAngle + angleVariation
          const distance = baseDistance + distanceVariation

          newPositions.set(confession.id, {
            x: centerX + Math.cos(angle) * distance,
            y: centerY + Math.sin(angle) * distance,
          })
        }
      }
    })

    // Iteratively resolve all collisions (run multiple passes)
    // If there's a new confession, keep it pinned and only push others away
    for (let iteration = 0; iteration < 15; iteration++) {
      let hadCollision = false
      const positionsArray = Array.from(newPositions.entries())

      for (let i = 0; i < positionsArray.length; i++) {
        for (let j = i + 1; j < positionsArray.length; j++) {
          const [id1, pos1] = positionsArray[i]
          const [id2, pos2] = positionsArray[j]

          const distance = getDistance(pos1, pos2)
          if (distance < minDistance) {
            hadCollision = true

            const dx = pos2.x - pos1.x
            const dy = pos2.y - pos1.y
            const dist = Math.sqrt(dx * dx + dy * dy) || 1
            const nx = dx / dist
            const ny = dy / dist
            const pushAmount = minDistance - distance

            // If one of them is the new confession, only push the other one
            if (newConfessionId !== null && id1 === newConfessionId) {
              // Keep id1 (new confession) fixed, push id2 away
              newPositions.set(id2, {
                x: pos2.x + nx * pushAmount,
                y: pos2.y + ny * pushAmount,
              })
              positionsArray[j] = [id2, newPositions.get(id2)!]
            } else if (newConfessionId !== null && id2 === newConfessionId) {
              // Keep id2 (new confession) fixed, push id1 away
              newPositions.set(id1, {
                x: pos1.x - nx * pushAmount,
                y: pos1.y - ny * pushAmount,
              })
              positionsArray[i] = [id1, newPositions.get(id1)!]
            } else {
              // Neither is the new confession, push both apart equally
              const halfPush = pushAmount / 2
              newPositions.set(id1, {
                x: pos1.x - nx * halfPush,
                y: pos1.y - ny * halfPush,
              })
              newPositions.set(id2, {
                x: pos2.x + nx * halfPush,
                y: pos2.y + ny * halfPush,
              })
              positionsArray[i] = [id1, newPositions.get(id1)!]
              positionsArray[j] = [id2, newPositions.get(id2)!]
            }
          }
        }
      }

      // If no collisions were found, we're done
      if (!hadCollision) break
    }

    // Remove positions for deleted confessions
    const confessionIds = new Set(confessions.map((c) => c.id))
    newPositions.forEach((_, id) => {
      if (!confessionIds.has(id)) {
        newPositions.delete(id)
      }
    })

    positionsMapRef.current = newPositions
    setPositions(new Map(newPositions))
  }, [confessions, offset, currentUser])

  // Touch/drag gesture handler for mobile scrolling
  const bind = useDrag(
    ({ offset: [x, y], lastOffset, movement: [mx, my], down, memo = lastOffset || [0, 0] }) => {
      // Don't pan if hovering over buttons
      if (isPanningPaused && down) {
        return memo
      }

      // Update offset based on drag movement
      setOffset({ x, y })

      return [x, y]
    },
    {
      from: () => [offset.x, offset.y],
      bounds: { left: -Infinity, right: Infinity, top: -Infinity, bottom: Infinity },
      rubberband: true,
    }
  )

  // Handle mouse movement for edge-based panning (desktop only, disabled on touch devices)
  useEffect(() => {
    // Check if device has touch capability
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0

    // Don't enable edge-based panning on touch devices
    if (isTouchDevice) {
      return
    }

    const handleMouseMove = (e: MouseEvent) => {
      // Don't pan if hovering over buttons or modal is open
      if (isPanningPaused || isModalOpen) {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current)
          animationFrameRef.current = undefined
        }
        return
      }

      const { clientX, clientY, currentTarget } = e
      const window = currentTarget as Window
      const { innerWidth, innerHeight } = window

      // Define edge zones (20% from each edge)
      const edgeZone = 0.2
      const panSpeed = 3

      let deltaX = 0
      let deltaY = 0

      // Left edge
      if (clientX < innerWidth * edgeZone) {
        deltaX = panSpeed * (1 - clientX / (innerWidth * edgeZone))
      }
      // Right edge
      else if (clientX > innerWidth * (1 - edgeZone)) {
        deltaX = -panSpeed * ((clientX - innerWidth * (1 - edgeZone)) / (innerWidth * edgeZone))
      }

      // Top edge
      if (clientY < innerHeight * edgeZone) {
        deltaY = panSpeed * (1 - clientY / (innerHeight * edgeZone))
      }
      // Bottom edge
      else if (clientY > innerHeight * (1 - edgeZone)) {
        deltaY = -panSpeed * ((clientY - innerHeight * (1 - edgeZone)) / (innerHeight * edgeZone))
      }

      if (deltaX !== 0 || deltaY !== 0) {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current)
        }

        const animate = () => {
          setOffset((prev) => ({
            x: prev.x + deltaX,
            y: prev.y + deltaY,
          }))
          animationFrameRef.current = requestAnimationFrame(animate)
        }

        animationFrameRef.current = requestAnimationFrame(animate)
      } else {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current)
          animationFrameRef.current = undefined
        }
      }
    }

    window.addEventListener('mousemove', handleMouseMove)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [isPanningPaused, isModalOpen])

  if (isLoading) {
    return (
      <div
        style={{
          width: '100vw',
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.2rem',
          color: 'var(--foreground)',
        }}
      >
        Loading confessions...
      </div>
    )
  }

  if (error) {
    return (
      <div
        style={{
          width: '100vw',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.2rem',
          color: 'var(--foreground)',
          padding: '2rem',
          textAlign: 'center',
        }}
      >
        <p>Error loading confessions</p>
        <p style={{ fontSize: '0.9rem', marginTop: '1rem', color: '#999' }}>
          {error instanceof Error ? error.message : 'Unknown error'}
        </p>
        <p style={{ fontSize: '0.8rem', marginTop: '0.5rem', color: '#666' }}>
          Check the browser console for details
        </p>
      </div>
    )
  }

  if (!confessions || confessions.length === 0) {
    return (
      <div
        style={{
          width: '100vw',
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.2rem',
          color: 'var(--foreground)',
        }}
      >
        No confessions yet. Be the first to confess!
      </div>
    )
  }

  const handleConfessionSuccess = () => {
    // Refetch confessions to include the new one
    queryClient.invalidateQueries({ queryKey: ['confessions'] })

    // Refetch current user to update confessed status
    queryClient.invalidateQueries({ queryKey: ['currentUser'] })

    // Don't reset offset - keep user at their current viewport position
  }

  // Calculate viewport bounds for culling (with buffer zone for smooth transitions)
  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1920
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 1080
  const bufferZone = 400 // Render bubbles up to 400px outside viewport

  // Viewport bounds in world coordinates (accounting for offset)
  const viewportBounds = {
    left: -offset.x - bufferZone,
    right: -offset.x + viewportWidth + bufferZone,
    top: -offset.y - bufferZone,
    bottom: -offset.y + viewportHeight + bufferZone,
  }

  // Filter confessions to only render those within viewport + buffer
  // This dramatically improves DOM performance while physics still runs for all
  const visibleConfessions = confessions?.filter((confession) => {
    const position = positions.get(confession.id)
    if (!position) return false

    const bubbleSize = 280
    const bubbleRadius = bubbleSize / 2

    // Check if bubble overlaps with viewport bounds (accounting for bubble size)
    return (
      position.x + bubbleRadius > viewportBounds.left &&
      position.x - bubbleRadius < viewportBounds.right &&
      position.y + bubbleRadius > viewportBounds.top &&
      position.y - bubbleRadius < viewportBounds.bottom
    )
  }) || []

  return (
    <div
      ref={canvasRef}
      {...bind()}
      style={{
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        position: 'relative',
        background: `
          radial-gradient(circle 600px at 20% 30%, rgba(139, 92, 246, 0.12) 0%, transparent 70%),
          radial-gradient(circle 700px at 80% 20%, rgba(59, 130, 246, 0.15) 0%, transparent 70%),
          radial-gradient(circle 500px at 40% 70%, rgba(168, 85, 247, 0.10) 0%, transparent 70%),
          radial-gradient(circle 650px at 90% 60%, rgba(96, 165, 250, 0.12) 0%, transparent 70%),
          radial-gradient(circle 550px at 10% 80%, rgba(147, 51, 234, 0.11) 0%, transparent 70%),
          radial-gradient(circle 600px at 60% 90%, rgba(79, 70, 229, 0.14) 0%, transparent 70%),
          #ffffff
        `,
        cursor: 'default',
        touchAction: 'none',
      }}
    >
      {/* Dev Mode Button (only visible in development) */}
      <DevModeButton
        isEnabled={devModeEnabled}
        onToggle={() => setDevModeEnabled(!devModeEnabled)}
        onHoverStart={() => setIsPanningPaused(true)}
        onHoverEnd={() => setIsPanningPaused(false)}
      />

      {/* Info Button */}
      <InfoButton
        onHoverStart={() => setIsPanningPaused(true)}
        onHoverEnd={() => setIsPanningPaused(false)}
      />

      <div
        style={{
          position: 'absolute',
          transform: `translate(${offset.x}px, ${offset.y}px)`,
          transition: 'transform 0.05s linear',
        }}
      >
        {visibleConfessions.map((confession) => {
          const position = positions.get(confession.id)
          if (!position) return null

          // Check if this confession has been rendered before
          const hasBeenRendered = hasRenderedRef.current.has(confession.id)
          // Mark as rendered
          if (!hasBeenRendered) {
            hasRenderedRef.current.add(confession.id)
          }

          return (
            <motion.div
              key={confession.id}
              initial={hasBeenRendered ? false : { scale: 0, opacity: 0 }}
              animate={{
                x: position.x - 140,
                y: position.y - 140,
                scale: 1,
                opacity: 1,
              }}
              transition={{
                type: 'spring',
                stiffness: 100,
                damping: 15,
                mass: 1,
              }}
              style={{
                position: 'absolute',
                width: '280px',
                height: '280px',
              }}
            >
              <ConfessionBubble confession={confession} />
            </motion.div>
          )
        })}
      </div>

      {/* Conditionally render button or timer based on confessed status (or always show button in dev mode) */}
      {currentUser?.confessed && !devModeEnabled ? (
        <ConfessionTimer
          onHoverStart={() => setIsPanningPaused(true)}
          onHoverEnd={() => setIsPanningPaused(false)}
        />
      ) : (
        <>
          <button
            onClick={() => setIsModalOpen(true)}
            style={{
              position: 'fixed',
              bottom: '2rem',
              left: '50%',
              transform: 'translateX(-50%)',
              padding: '1rem 2rem',
              fontSize: '1rem',
              fontWeight: '600',
              borderRadius: '2rem',
              border: '3px solid transparent',
              backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #3b82f6, #8b5cf6, #ec4899)',
              backgroundOrigin: 'border-box',
              backgroundClip: 'padding-box, border-box',
              color: '#1f2937',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)',
              transition: 'all 0.2s',
              zIndex: 1000,
            }}
            onMouseEnter={(e) => {
              setIsPanningPaused(true)
              e.currentTarget.style.transform = 'translateX(-50%) translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(139, 92, 246, 0.5)'
              e.currentTarget.style.filter = 'brightness(0.98)'
            }}
            onMouseLeave={(e) => {
              setIsPanningPaused(false)
              e.currentTarget.style.transform = 'translateX(-50%) translateY(0)'
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(139, 92, 246, 0.3)'
              e.currentTarget.style.filter = 'brightness(1)'
            }}
          >
            Write your confession
          </button>

          {/* Confession modal */}
          <ConfessionModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onSuccess={handleConfessionSuccess}
            devMode={devModeEnabled}
          />
        </>
      )}
    </div>
  )
}
