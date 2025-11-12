# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js 16 application using the App Router architecture, built with TypeScript, React 19, and Tailwind CSS v4. The project was bootstrapped with `create-next-app`.

## Development Commands

```bash
# Start development server (http://localhost:3000)
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run ESLint
npm run lint

# Regenerate TypeScript types from Supabase database
npm run types:generate
```

## Architecture

### App Router Structure
- Uses Next.js App Router (`app/` directory)
- `app/layout.tsx`: Root layout with QueryProvider wrapper
- `app/page.tsx`: Home page displaying confession canvas
- `app/globals.css`: Global styles with Tailwind CSS v4 imports and CSS custom properties
- `lib/providers/query-provider.tsx`: TanStack Query provider setup

### Homepage Features
- **Confession Canvas**: Interactive viewport displaying confessions as floating bubbles
- **Cursor-based Navigation**: Move cursor to screen edges to pan and explore more confessions
- **Dynamic Positioning System**: Confessions use physics-based collision detection to maintain spacing
- **Seeded Randomization**: Each user sees a unique but consistent layout based on their user_id
- **Smooth Animations**: Framer Motion provides spring-based physics for natural movement
- **Hover Effects**: Bubbles glow and brighten on hover for better interactivity
- **Dev Mode**: Development-only toggle to bypass confession limits for testing

### Components
- `components/confession-canvas.tsx`: Main client component handling confession display, panning, and physics
- `components/confession-bubble.tsx`: Individual confession bubble component with styling
- `components/confession-modal.tsx`: Modal for submitting new confessions
- `components/confession-timer.tsx`: Countdown timer showing time until next confession allowed
- `components/dev-mode-button.tsx`: Development-only toggle button for unlimited confessions

### Key Configuration Files
- `next.config.ts`: Next.js configuration (TypeScript)
- `tsconfig.json`: TypeScript configuration with `@/*` path alias pointing to root
- `eslint.config.mjs`: ESLint 9+ flat config using Next.js presets
- `postcss.config.mjs`: PostCSS configuration for Tailwind CSS v4

### Styling
- **Tailwind CSS v4**: Uses the newer `@tailwindcss/postcss` plugin with inline theme configuration
- CSS custom properties defined in `globals.css` with light/dark mode support
- Dark mode handled via `prefers-color-scheme` media query
- Custom theme colors: `background`, `foreground`
- Custom fonts: Geist Sans and Geist Mono (loaded via `next/font/google`)

### TypeScript
- Strict mode enabled
- Path alias: `@/*` maps to root directory
- Target: ES2017
- JSX runtime: `react-jsx`

## Technology Stack

- **Next.js**: 16.0.1 (App Router)
- **React**: 19.2.0
- **TypeScript**: ^5
- **Tailwind CSS**: ^4 (with @tailwindcss/postcss)
- **ESLint**: ^9 (with eslint-config-next)
- **Supabase**: Database and authentication backend (@supabase/supabase-js, @supabase/ssr)
- **TanStack Query**: Data fetching and state management (@tanstack/react-query)
- **Framer Motion**: Animation library for smooth, spring-based physics animations
- **Anthropic SDK**: Claude AI API for confession severity analysis (@anthropic-ai/sdk)
- **Zod**: Schema validation and type safety

## Supabase Integration

### Configuration

**Environment Variables:**
Create a `.env.local` file with the following:
```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Get these values from [Supabase Dashboard](https://app.supabase.com/project/_/settings/api):
- **Project URL**: Found in Project Settings → API
- **Anon Key**: Public key for client-side operations
- **Service Role Key**: Secret key for server-side admin operations (bypasses RLS)

### Supabase Client Usage

**Client Components** (browser):
```typescript
import { createClient } from '@/lib/supabase/client'
const supabase = createClient() // Fully typed with Database types
```

**Server Components** (server-side):
```typescript
import { createClient } from '@/lib/supabase/server'
const supabase = await createClient() // Fully typed with Database types
```

**Example with type inference:**
```typescript
import { createClient } from '@/lib/supabase/client'
const supabase = createClient()

// TypeScript knows the exact shape of the data
const { data } = await supabase.from('confessions').select('*')
// data is typed as: Array<{ id: number, "text-content": string, created_at: string }>
```

**Middleware** (`middleware.ts`):
- Automatically refreshes auth sessions for all routes
- Cookie-based session management configured
- Auth state is maintained across Server and Client Components
- Handles invalid sessions (e.g., manually deleted users) by signing out and creating new anonymous user
- Gracefully recovers from authentication errors without user intervention

### TypeScript Database Types
All Supabase clients are fully typed using generated TypeScript types from the database schema.

**Regenerate types after database changes:**
```bash
npm run types:generate
```

This generates `types/database.ts` with complete type definitions for all tables, including:
- Row types (returned from SELECT queries)
- Insert types (for INSERT operations)
- Update types (for UPDATE operations)

**Current schema:**
- `confessions` table: id, text-content, severity (int2, default 0), created_at
- `users` table: id, user_id (UUID FK to auth.users), confessed, created_at

### Automatic Anonymous Authentication

**Anonymous Sign-ins:**
Users are automatically authenticated using Supabase's built-in anonymous authentication when they first visit the site. The middleware handles this automatically:

1. On first visit, the middleware detects no authenticated session
2. Calls `supabase.auth.signInAnonymously()` to create an anonymous user in `auth.users`
3. Creates a corresponding record in the custom `users` table with `user_id` referencing the auth user
4. Sets `confessed: false` by default
5. Session is managed automatically via Supabase cookies (JWT tokens)

**Authentication Architecture:**
- **Supabase Auth**: Handles anonymous user creation and session management
- **auth.users table**: Stores the anonymous user (managed by Supabase)
- **Custom users table**: Stores additional user data (`confessed` flag) with FK to `auth.users(id)`
- **Row Level Security (RLS)**: Enabled on both tables for proper security

**User Lifecycle:**
- Users are automatically created on first visit via anonymous sign-in
- Session is cookie-based (browser-specific, not IP-based)
- **Anonymous users older than 24 hours are automatically deleted daily at 00:00 UTC** via pg_cron job
- **Invalid confessions (severity 0) older than 24 hours are also deleted daily** to remove spam/nonsense
- If user clears cookies, a new anonymous user is created on next visit

**Getting Current User:**
```typescript
import { getCurrentUser } from '@/lib/utils/user'

const user = await getCurrentUser()
if (user) {
  console.log('User ID:', user.id)
  console.log('Auth User ID:', user.user_id) // UUID from auth.users
  console.log('Has confessed:', user.confessed)
}
```

**RLS Policies:**
- Users can only read/write their own data (checked via `auth.uid()`)
- All confessions are readable by authenticated users
- Confessions can be inserted by any authenticated user

**Important Notes:**
- No traditional authentication (email/password) is used
- Users are ephemeral and automatically cleaned up after 24 hours
- No IP addresses are stored (better privacy compliance)
- The `confessed` flag tracks whether the user has submitted a confession
- Anonymous users have `is_anonymous: true` in their JWT claims
- Rate limiting: 30 anonymous sign-ins per hour per IP (configurable in Supabase Dashboard)

### File Structure
- `lib/supabase/client.ts`: Browser client for Client Components (typed)
- `lib/supabase/server.ts`: Server client for Server Components and Route Handlers (typed)
- `lib/supabase/middleware.ts`: Session management and automatic anonymous user creation (typed)
- `lib/actions/auth.ts`: Server actions for user operations
- `lib/utils/user.ts`: User helper functions (getCurrentUser)
- `middleware.ts`: Next.js middleware entry point
- `types/database.ts`: Generated TypeScript types from Supabase schema
- `supabase/migrations/`: Database migration files
- `supabase/MIGRATION_GUIDE.md`: Guide for setting up anonymous authentication

## TanStack Query Integration

### Setup
TanStack Query is configured globally via `QueryProvider` in `app/layout.tsx`:
- Default staleTime: 60 seconds (optimized for SSR)
- React Query DevTools included (only in development)

### Usage Pattern

**In Client Components:**
```typescript
'use client'

import { useQuery, useMutation } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

function MyComponent() {
  const supabase = createClient()

  const { data, isLoading } = useQuery({
    queryKey: ['todos'],
    queryFn: async () => {
      const { data } = await supabase.from('todos').select('*')
      return data
    },
  })

  const mutation = useMutation({
    mutationFn: async (newTodo) => {
      const { data } = await supabase.from('todos').insert(newTodo)
      return data
    },
  })
}
```

**Best Practices:**
- Use TanStack Query for all data fetching in Client Components
- Combine with Supabase client for database operations
- Use `queryKey` arrays for proper cache invalidation
- Leverage `useMutation` for create/update/delete operations

## Zod Integration

### Usage Pattern

Zod is used for schema validation and type inference:

```typescript
import { z } from 'zod'

// Define schema
const todoSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1, 'Title is required'),
  completed: z.boolean().default(false),
  created_at: z.string().datetime(),
})

// Infer TypeScript type
type Todo = z.infer<typeof todoSchema>

// Validate data
const result = todoSchema.safeParse(data)
if (result.success) {
  const todo: Todo = result.data
}
```

**Best Practices:**
- Define schemas for all database tables and API responses
- Use `z.infer<typeof schema>` for type safety
- Validate data from external sources (API responses, user input)
- Combine with TanStack Query for validated data fetching

## Confession Positioning System

The confession canvas uses a sophisticated physics-based positioning system to create a unique, collision-free layout for each user.

### Core Principles

1. **Position Storage by ID**: Each confession's position is stored in a Map keyed by confession ID, ensuring stable positions that don't recalculate on every render
2. **Viewport-Relative Placement**: New confessions appear at the center of the user's current viewport (not the world origin)
3. **Collision Detection**: Iterative physics simulation ensures no confessions overlap
4. **Smooth Animations**: Framer Motion provides spring-based animations for all position changes

### Initial Layout Algorithm

When confessions are first loaded, they are positioned using a modified golden spiral pattern with seeded randomization:

```typescript
// Base spiral position
const baseAngle = (index * 137.5 * Math.PI) / 180 // Golden angle
const baseDistance = Math.sqrt(index) * spiralSpacing

// Add deterministic random variations based on user_id
const angleVariation = (random() - 0.5) * Math.PI * 0.3 // ±27 degrees
const distanceVariation = (random() - 0.5) * spiralSpacing * 0.4

const angle = baseAngle + angleVariation
const distance = baseDistance + distanceVariation
```

**Key Features:**
- Uses golden angle (137.5°) for natural distribution
- Adds ±27° angle variation and ±40% distance variation
- Random variations are deterministic (seeded by user_id)
- Creates organic, scattered look while maintaining general structure

### Seeded Randomization

Each user sees a unique but consistent layout:

1. **Seed Generation**: User's `user_id` (UUID) is hashed to create a numeric seed
2. **Seeded PRNG**: Mulberry32 algorithm generates deterministic random numbers
3. **Consistent Layout**: Same user always sees same positions on refresh
4. **Unique Per User**: Different users see different layouts

```typescript
// Hash UUID to create seed
const hashUserId = (userId: string): number => {
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash
  }
  return Math.abs(hash)
}

// Mulberry32 PRNG
const seededRandom = (seed: number) => {
  return () => {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
```

**Benefits:**
- No database storage required
- Pure client-side computation
- Personalized experience for each user
- Deterministic and reproducible

### New Confession Placement

When a user submits a confession:

1. **Viewport Center Calculation**: `position = {x: viewportCenterX - offset.x, y: viewportCenterY - offset.y}`
2. **Position Pinning**: The new confession's position is locked at viewport center
3. **Cascading Push**: Existing confessions are pushed away in a ripple effect

### Collision Resolution Algorithm

The system iteratively resolves all collisions to ensure no bubbles overlap. The number of iterations varies based on the scenario:

```typescript
const maxIterations = isInitialPositioning ? 50 : 15

for (let iteration = 0; iteration < maxIterations; iteration++) {
  for each pair of confessions {
    if (distance < minDistance) {
      if (one is the new confession) {
        // Keep new confession fixed, push other away (full amount)
        push_other_away(minDistance - distance)
      } else {
        // Push both apart equally (half amount each)
        push_both_apart((minDistance - distance) / 2)
      }
    }
  }
  if (no_collisions_found) break
}
```

**Iteration Strategy:**
- **Initial positioning**: Up to 50 iterations (needed for large numbers of confessions)
- **Adding new confession**: Up to 15 iterations (fewer collisions to resolve)
- **Early exit**: Stops as soon as no collisions remain

**Why More Iterations for Initial Load:**
The golden spiral placement creates many overlaps initially, especially with 100+ confessions. With 141 confessions, the algorithm may find 4000+ collision pairs that need to be resolved through cascading pushes. 50 iterations ensures all overlaps are eliminated before the page is displayed to the user.

**Timing:**
- Collision detection runs during the loading screen
- The page only renders once `positionsReady` is true
- User never sees overlapping bubbles on initial load

**Key Behaviors:**
- **New confession**: Position is immovable (pinned at viewport center)
- **Direct collision**: Existing confession is pushed full distance away
- **Indirect collision**: Both confessions push apart equally
- **Cascade effect**: Pushed confessions may push into others, creating ripples
- **Early exit**: Stops when no collisions remain

**Constants:**
- `bubbleSize`: 280px (diameter of each bubble)
- `minDistance`: 320px (bubbleSize + 40px gap)
- `spiralSpacing`: 150px (base distance between spiral rings)

**Effect Dependencies:**
The positioning effect runs when:
1. **Initial load**: `confessions` and `currentUser` are loaded (waits for both)
2. **New confession added**: `confessions.length` increases
3. **Viewport change**: `offset` changes (only affects new confession placement)

The effect includes an early return to prevent unnecessary re-runs:
- Skips if confessions or currentUser not loaded
- Skips if initial positioning already completed AND no new confession added
- This prevents collision detection from running on every scroll

### Animation System

Uses Framer Motion with spring physics:

```typescript
<motion.div
  initial={hasBeenRendered ? false : {
    x: position.x - 140, // Start at final position
    y: position.y - 140,
    scale: 0,             // Scale up from 0
    opacity: 0            // Fade in from transparent
  }}
  animate={{
    x: position.x - 140, // Center the bubble (280px / 2)
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
>
```

**Animation Properties:**
- **Spring physics**: Natural, bouncy movement
- **Stiffness**: 100 (controls oscillation speed)
- **Damping**: 15 (controls how quickly motion settles)
- **Mass**: 1 (affects inertia)

**Animation Behavior:**
- **First render** (`hasBeenRendered = false`): Bubble spawns at its collision-free position with scale: 0 and opacity: 0, then animates to full size
- **Subsequent updates** (`hasBeenRendered = true`): `initial={false}` disables initial animation, bubble smoothly transitions to new position if needed
- **No position sliding**: By setting x/y in the `initial` state, bubbles never slide from (0,0) or an incorrect position - they appear exactly where they belong

### Hover Effects

Confessions use glow and brightness effects (no transform) to avoid conflicts with positioning:

```typescript
onMouseEnter: {
  boxShadow: '0 8px 24px rgba(59, 130, 246, 0.4)', // Blue glow
  filter: 'brightness(1.1)', // 10% brighter
}
```

**Why no scale transform:**
- Transform conflicts with motion.div's position animations
- Would cause position jumping on hover
- Glow + brightness provides clear visual feedback without layout shift

## Development Mode

A special development-only feature to bypass confession submission limits for testing.

### Overview

**Location**: Top-left corner of the screen
**Visibility**: Only visible when `process.env.NODE_ENV === 'development'`
**Type**: Binary toggle switch (ON/OFF)

### Functionality

When **Dev Mode is ON**:
- User can submit unlimited confessions without waiting
- `confessed` status check is skipped in server action
- User's `confessed` flag is never set to `true`
- "Write your confession" button always remains visible (timer is hidden)

When **Dev Mode is OFF**:
- Normal behavior: one confession per 24 hours
- `confessed` flag is checked and updated
- Timer shows time remaining until next confession

### Implementation Details

**Button Component** (`components/dev-mode-button.tsx`):
```typescript
export function DevModeButton({ isEnabled, onToggle }: DevModeButtonProps) {
  if (process.env.NODE_ENV !== 'development') {
    return null // Not rendered in production
  }

  return (
    <button onClick={onToggle} style={{
      backgroundColor: isEnabled ? '#10b981' : '#6b7280', // Green when ON, gray when OFF
      // ... styling
    }}>
      Dev Mode: {isEnabled ? 'ON' : 'OFF'}
    </button>
  )
}
```

**Server Action** (`lib/actions/confessions.ts`):
```typescript
export async function submitConfession(content: string, devMode = false) {
  // Skip confessed check if dev mode enabled
  if (!devMode) {
    const { data: userData } = await supabase
      .from('users')
      .select('confessed')
      .eq('user_id', user.id)
      .single()

    if (userData?.confessed) {
      return { success: false, error: 'You have already submitted a confession' }
    }
  }

  // Insert confession...

  // Skip updating confessed status if dev mode enabled
  if (!devMode) {
    await supabase
      .from('users')
      .update({ confessed: true })
      .eq('user_id', user.id)
  }
}
```

**UI Conditional** (`components/confession-canvas.tsx`):
```typescript
{currentUser?.confessed && !devModeEnabled ? (
  <ConfessionTimer /> // Show timer
) : (
  <button>Write your confession</button> // Show button
)}
```

### Use Cases

- **Rapid testing**: Test confession submission flow multiple times quickly
- **UI testing**: Observe cascade animations with multiple confessions
- **Layout testing**: See how many confessions affect positioning
- **Demo purposes**: Demonstrate the app with multiple submissions

**Important**: This feature is completely removed in production builds. The button won't render, and the server action always enforces the `confessed` check in production.

## Confession Severity Analysis

Each confession is automatically analyzed using Claude AI to determine its severity, which is then visualized through bubble colors ranging from blue (light) to purple (moderate) to red (serious).

### Overview

**Purpose**: Provide visual indication of confession seriousness
**Technology**: Anthropic Claude API (Haiku model for fast, cost-effective analysis)
**Scale**: 0-255 integer stored in database
**Visual**: Color gradient from blue → purple → red

### Database Schema

**Column**: `severity`
**Type**: `int2` (PostgreSQL smallint, 2-byte integer)
**Range**: 0-255
**Default**: 0
**Nullable**: No

### Severity Scoring

The Claude API first validates whether the submission is a genuine confession, then assigns a severity score:

**Validation Step**:
- **0**: Not a valid confession (nonsense, spam, gibberish, or clearly not a confession)
- Displayed in **gray** to indicate invalid content

**Severity Scale for Valid Confessions**:
- **1-50**: Very light (ate someone's food, small lie, minor embarrassment)
- **51-100**: Light to moderate (broke something valuable, hurt someone's feelings)
- **101-150**: Moderate (cheating, betrayal, theft of significant value)
- **151-200**: Serious (illegal activity, major betrayal, serious harm)
- **201-255**: Extremely serious (violence, major crimes)

### Implementation

**Analysis Function** (`lib/utils/severity.ts`):

```typescript
export async function analyzeSeverity(confessionText: string): Promise<number> {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  })

  const message = await anthropic.messages.create({
    model: 'claude-3-haiku-20240307', // Fast and cheap
    max_tokens: 50,
    messages: [
      {
        role: 'user',
        content: `Analyze this confession and rate its severity on a scale from 0 to 255...

        Confession: "${confessionText}"`,
      },
    ],
  })

  const severity = parseInt(message.content[0].text.trim(), 10)
  return severity // Clamped and validated to 0-255 range
}
```

**Color Mapping** (`lib/utils/severity.ts`):

```typescript
export function getSeverityColor(severity: number): string {
  // Severity 0 = gray (invalid confession)
  if (severity === 0) {
    return 'rgb(156, 163, 175)' // Gray-400
  }

  // 1-127: Blue (59, 130, 246) → Purple (168, 85, 247)
  // 128-255: Purple (168, 85, 247) → Red (220, 0, 60)

  if (severity <= 127) {
    const t = (severity - 1) / 126 // Normalize 1-127 to 0-1
    const r = 59 + (168 - 59) * t
    const g = 130 - (130 - 85) * t
    const b = 246 - (246 - 247) * t
    return `rgb(${r}, ${g}, ${b})`
  } else {
    const t = (severity - 128) / 127
    const r = 168 + (220 - 168) * t
    const g = 85 - 85 * t
    const b = 247 - (247 - 60) * t
    return `rgb(${r}, ${g}, ${b})`
  }
}
```

### Integration Flow

1. **User submits confession** via modal
2. **Server action** (`lib/actions/confessions.ts`) calls `analyzeSeverity()`
3. **Claude API** analyzes text and returns severity score (0-255)
4. **Database insert** includes severity value
5. **Bubble rendering** applies color via `getSeverityColor()`
6. **Visual result**: Confession appears in color matching its severity

### API Configuration

**Environment Variable**: `ANTHROPIC_API_KEY`
**Location**: `.env.local` file (not committed to git)
**How to get**:
1. Visit [console.anthropic.com](https://console.anthropic.com)
2. Sign in and navigate to "API Keys"
3. Create new key and copy value
4. Add to `.env.local`: `ANTHROPIC_API_KEY=sk-ant-...`

**Cost Considerations**:
- Model: Claude 3 Haiku (fastest, cheapest)
- Cost: ~$0.001 per confession analysis
- $5-10 in API credits lasts for thousands of confessions

**Fallback Behavior**:
- If `ANTHROPIC_API_KEY` is not set: defaults to severity 0 (gray)
- If API call fails: defaults to severity 0 (gray)
- Error is logged to console but doesn't block confession submission
- Confessions with severity 0 appear as gray bubbles, indicating unvalidated content

### Color Gradient Details

**Gray (0)**: `rgb(156, 163, 175)` - Tailwind gray-400 (invalid/spam)
**Blue (1)**: `rgb(59, 130, 246)` - Tailwind blue-500 (lightest valid confession)
**Purple (127-128)**: `rgb(168, 85, 247)` - Tailwind purple-500 (moderate)
**Red (255)**: `rgb(220, 0, 60)` - Custom deep red (most severe)

The gradient smoothly interpolates RGB values for all intermediate severity scores (1-255), creating a continuous visual spectrum that aligns with the site's blue/purple color scheme while still indicating severity clearly. Gray bubbles stand out as invalid submissions.

### Text Visibility

Confession text is rendered in white (`#ffffff`) to ensure readability across all severity colors, from gray (invalid) to light blue (minor) to deep red (severe).

### Invalid Confession Cleanup

Invalid confessions (severity 0) are automatically purged from the database to keep the platform clean:

**Cleanup Schedule**: Daily at 00:00 UTC via pg_cron
**Criteria**: Confessions with `severity = 0` AND `created_at > 24 hours ago`
**Purpose**: Remove spam, nonsense, and invalid submissions

**SQL Implementation**:
```sql
-- Combined cleanup job (users + invalid confessions)
SELECT cron.schedule(
  'delete-old-data-daily',
  '0 0 * * *',  -- Every day at midnight UTC
  $$
  -- Delete anonymous users older than 24 hours
  DELETE FROM auth.users

  -- Delete invalid confessions (severity 0) older than 24 hours
  DELETE FROM confessions
  WHERE severity = 0
  $$
);
```

**Result**:
- Valid confessions (severity ≥ 1) are **permanent**
- Invalid confessions (severity 0) are **temporary** (24-hour lifespan)
- Database stays clean without manual intervention
- Gray bubbles naturally disappear after a day

### Positioning Strategy

Valid and invalid confessions are positioned differently on initial load:

**Valid Confessions (severity ≥ 1)**:
- Positioned in **inner spiral rings** (close to center)
- Always visible on first page load
- Colored bubbles ensure immediate visual appeal

**Invalid Confessions (severity 0)**:
- Positioned in **outer spiral rings** (edges of canvas)
- Require panning to discover
- Gray bubbles clearly indicate invalid content
- Automatically deleted after 24 hours

This ensures users always see legitimate, colorful confessions when they first visit the site.

## Development Notes

- Pages auto-update on file changes (Fast Refresh)
- Static assets are served from `public/` directory
- The project uses Server Components by default (App Router)
- For Client Components, add `"use client"` directive at the top of files
- Supabase auth sessions are automatically refreshed via middleware
- Users are automatically created on first visit via anonymous authentication
- All user data expires after 24 hours (daily cleanup at 00:00 UTC in database)
- Dev mode toggle (top-left corner) allows unlimited confessions during development
- Each user sees a unique but consistent confession layout based on their user_id seed