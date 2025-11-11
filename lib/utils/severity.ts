import Anthropic from '@anthropic-ai/sdk'

/**
 * Analyzes a confession and returns a severity score from 0-255
 * 0 = Lightest/least severe (light blue)
 * 255 = Most severe (deep red)
 */
export async function analyzeSeverity(confessionText: string): Promise<number> {
  // Fallback to 0 if API key is not configured
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('ANTHROPIC_API_KEY not configured, defaulting severity to 0')
    return 0
  }

  try {
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    })

    const message = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307', // Fast and cheap model for quick analysis
      max_tokens: 50,
      messages: [
        {
          role: 'user',
          content: `First, determine if this is a genuine confession (an admission of wrongdoing, mistake, or secret). If it's nonsense, spam, gibberish, or not a confession at all, respond with 0.

If it IS a valid confession, rate its severity on a scale from 1 to 255:
- 1-50: Very light (ate someone's food, small lie, minor embarrassment)
- 51-100: Light to moderate (broke something valuable, hurt someone's feelings)
- 101-150: Moderate (cheating, betrayal, theft of significant value)
- 151-200: Serious (illegal activity, major betrayal, serious harm)
- 201-255: Extremely serious (violence, major crimes)

Respond with ONLY a number between 0 and 255, nothing else.

Text: "${confessionText}"`,
        },
      ],
    })

    const responseText = message.content[0].type === 'text' ? message.content[0].text.trim() : '0'
    const severity = parseInt(responseText, 10)

    // Validate the response is a number between 0-255
    if (isNaN(severity) || severity < 0 || severity > 255) {
      console.error('Invalid severity response from Claude:', responseText)
      return 0 // Default to 0 if invalid
    }

    return severity
  } catch (error) {
    console.error('Error analyzing severity with Claude API:', error)
    return 0 // Default to 0 on error
  }
}

/**
 * Converts a severity score (0-255) to a color
 * 0: Gray (not a valid confession)
 * 1-127: Blue to Purple
 * 128-255: Purple to Red
 */
export function getSeverityColor(severity: number): string {
  // Clamp severity to 0-255 range
  const clampedSeverity = Math.max(0, Math.min(255, severity))

  // Severity 0 = gray (invalid confession/spam/nonsense)
  if (clampedSeverity === 0) {
    return 'rgb(156, 163, 175)' // Gray-400
  }

  // Color transitions for valid confessions:
  // 1-127: Blue to Purple
  // 128-255: Purple to Red

  if (clampedSeverity <= 127) {
    // Blue to Purple transition (highly saturated & bright)
    const t = (clampedSeverity - 1) / 126 // Normalize to 0-1 for severity 1-127
    const r = Math.round(30 + (180 - 30) * t) // 30 (bright blue) → 180 (bright purple)
    const g = Math.round(150 - (150 - 60) * t) // 150 (bright blue) → 60 (bright purple)
    const b = Math.round(255 - (255 - 255) * t) // 255 (bright blue) → 255 (bright purple)
    return `rgb(${r}, ${g}, ${b})`
  } else {
    // Purple to Red transition (highly saturated & bright)
    const t = (clampedSeverity - 128) / 127
    const r = Math.round(180 + (255 - 180) * t) // 180 (bright purple) → 255 (bright red)
    const g = Math.round(60 - (60 - 30) * t) // 60 (bright purple) → 30 (bright red)
    const b = Math.round(255 - (255 - 100) * t) // 255 (bright purple) → 100 (bright red)
    return `rgb(${r}, ${g}, ${b})`
  }
}
