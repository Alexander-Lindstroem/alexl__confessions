/**
 * Generate a unique slug for a confession based on its ID and text content
 * Uses a simple hash function to create a deterministic, URL-safe string
 */
export function generateConfessionSlug(id: number, textContent: string): string {
  // Combine ID and text content
  const combined = `${id}-${textContent}`

  // Simple hash function
  let hash = 0
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32-bit integer
  }

  // Convert to base36 and make it positive
  const hashString = Math.abs(hash).toString(36)

  // Return slug format: id-hash
  return `${id}-${hashString}`
}

/**
 * Parse a confession slug to extract the ID
 */
export function parseConfessionSlug(slug: string): number | null {
  const parts = slug.split('-')
  if (parts.length < 2) return null

  const id = parseInt(parts[0], 10)
  return isNaN(id) ? null : id
}
