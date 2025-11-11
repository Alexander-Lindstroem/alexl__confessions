'use server'

import { createClient } from '@/lib/supabase/server'
import { confessionSchema } from '@/lib/validations/confession'
import { analyzeSeverity } from '@/lib/utils/severity'
import { revalidatePath } from 'next/cache'

export async function submitConfession(content: string, devMode = false) {
  try {
    // Validate input
    const result = confessionSchema.safeParse({ content })

    if (!result.success) {
      return {
        success: false,
        error: result.error.issues[0]?.message || 'Validation failed',
      }
    }

    const supabase = await createClient()

    // Get current authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return {
        success: false,
        error: 'You must be authenticated to submit a confession',
      }
    }

    // Check if user has already confessed (skip in dev mode)
    if (!devMode) {
      const { data: userData, error: userFetchError } = await supabase
        .from('users')
        .select('confessed')
        .eq('user_id', user.id)
        .single()

      if (userFetchError) {
        return {
          success: false,
          error: 'Failed to verify user status',
        }
      }

      if (userData?.confessed) {
        return {
          success: false,
          error: 'You have already submitted a confession',
        }
      }
    }

    // Analyze severity using Claude API
    const severity = await analyzeSeverity(result.data.content)

    // Insert confession with severity
    const { data: confession, error: insertError } = await supabase
      .from('confessions')
      .insert({
        'text-content': result.data.content,
        severity: severity,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error inserting confession:', insertError)
      return {
        success: false,
        error: 'Failed to submit confession',
      }
    }

    // Update user's confessed status (skip in dev mode)
    if (!devMode) {
      const { error: updateError } = await supabase
        .from('users')
        .update({ confessed: true })
        .eq('user_id', user.id)

      if (updateError) {
        console.error('Error updating user:', updateError)
        return {
          success: false,
          error: 'Failed to update user status',
        }
      }
    }

    // Revalidate the home page to show new confession
    revalidatePath('/')

    return {
      success: true,
      confession,
    }
  } catch (error) {
    console.error('Unexpected error submitting confession:', error)
    return {
      success: false,
      error: 'An unexpected error occurred',
    }
  }
}
