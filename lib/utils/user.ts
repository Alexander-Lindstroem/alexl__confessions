'use server'

import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'

type User = Database['public']['Tables']['users']['Row']

export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createClient()

  // Get the authenticated user from Supabase Auth
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    return null
  }

  // Fetch the corresponding user record from the users table
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('user_id', authUser.id)
    .single()

  if (error) {
    console.error('Error fetching current user:', error)
    return null
  }

  return data
}
