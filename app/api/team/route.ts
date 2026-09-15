import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { createAdminClient } = await import('@/utils/supabase/server')
    const adminSupabase = createAdminClient()

    // Get current user's profile
    const { data: profile } = await adminSupabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    if (profile.role === 'manager') {
      // Fetch all employees/interns where manager_id is this user
      const { data: teamMembers, error } = await adminSupabase
        .from('profiles')
        .select('id, email, role, created_at')
        .eq('manager_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      return NextResponse.json({
        team: teamMembers || [],
        manager: profile
      })
    } else {
      // User is an employee/intern
      if (!profile.manager_id) {
        return NextResponse.json({
          team: [],
          manager: null,
          message: 'You are not assigned to any manager yet.'
        })
      }

      // Fetch the manager's profile
      const { data: managerProfile, error: managerError } = await adminSupabase
        .from('profiles')
        .select('id, email, role')
        .eq('id', profile.manager_id)
        .single()

      if (managerError) throw managerError

      // Fetch teammates (other profiles with the same manager)
      const { data: teamMembers, error: teamError } = await adminSupabase
        .from('profiles')
        .select('id, email, role, created_at')
        .eq('manager_id', profile.manager_id)
        .neq('id', user.id) // Exclude the current user from the list
        .order('created_at', { ascending: false })

      if (teamError) throw teamError

      return NextResponse.json({
        team: teamMembers || [],
        manager: managerProfile
      })
    }
  } catch (error: any) {
    console.error('Error fetching team:', error)
    return NextResponse.json({ error: 'Failed to fetch team data' }, { status: 500 })
  }
}
