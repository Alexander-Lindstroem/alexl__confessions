import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/types/database'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
    error: getUserError,
  } = await supabase.auth.getUser()

  // If there's an error getting the user (e.g., user was deleted), sign out to clear invalid cookies
  if (getUserError) {
    console.log('Error getting user, signing out to clear invalid session:', getUserError)
    await supabase.auth.signOut()
    // After signOut, fall through to create a new anonymous user
  }

  // If no user exists, create an anonymous user automatically
  if (!user || getUserError) {
    try {
      const { data, error } = await supabase.auth.signInAnonymously()

      if (error) {
        console.error('Error creating anonymous user:', error)
        return supabaseResponse
      }

      if (data.user) {
        // Create corresponding entry in custom users table
        const { error: insertError } = await supabase
          .from('users')
          .insert({
            user_id: data.user.id,
            confessed: false,
          })
          .select()
          .single()

        if (insertError) {
          // Ignore duplicate key errors (user already exists in users table)
          if (!insertError.message.includes('duplicate key')) {
            console.error('Error creating user record:', insertError)
          }
        }
      }
    } catch (error) {
      console.error('Error in automatic user creation:', error)
    }
  } else {
    // User exists, ensure they have a record in the users table
    try {
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (!existingUser) {
        // Create the users record if it doesn't exist
        await supabase
          .from('users')
          .insert({
            user_id: user.id,
            confessed: false,
          })
      }
    } catch (error) {
      // Silently fail - this is just a safety check
      console.error('Error checking/creating user record:', error)
    }
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
  // creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely.

  return supabaseResponse
}
