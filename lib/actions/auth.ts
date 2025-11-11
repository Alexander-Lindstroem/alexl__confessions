'use server'

import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'

type User = Database['public']['Tables']['users']['Row']

/**
 * Gets or creates the current user record in the users table
 * This is now handled automatically by the middleware, but this function
 * can be used as a helper to ensure a user record exists
 */
export async function getOrCreateUser(): Promise<User | null> {
  const supabase = await createClient()

  try {
    // Get the authenticated user from Supabase Auth
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      // No authenticated user - this shouldn't happen if middleware is working
      console.error('No authenticated user found')
      return null
    }

    // Check if user record exists in users table
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('user_id', authUser.id)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      // PGRST116 is "not found" error, which is expected for new users
      console.error('Error fetching user:', fetchError)
      return null
    }

    if (existingUser) {
      return existingUser
    }

    // Create new user record (fallback - middleware should handle this)
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({
        user_id: authUser.id,
        confessed: false,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating user:', insertError)
      return null
    }

    return newUser
  } catch (error) {
    console.error('Unexpected error in getOrCreateUser:', error)
    return null
  }
}
