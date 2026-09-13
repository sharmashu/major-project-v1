import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = createClient()
    
    // 1. Verify caller is a manager
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'manager') {
      return NextResponse.json({ error: 'Forbidden. Only managers can invite.' }, { status: 403 })
    }

    // 2. Parse request
    const { email, role, repositoryIds } = await request.json()
    if (!email || !role) return NextResponse.json({ error: 'Missing email or role' }, { status: 400 })

    // 3. Admin client to bypass normal auth rules and invite user
    // (Needs SUPABASE_SERVICE_ROLE_KEY to work in prod)
    // Wait, createAdminClient is exported from server.ts
    const { createAdminClient } = await import('@/utils/supabase/server')
    const adminAuthClient = createAdminClient()

    const { data: inviteData, error: inviteError } = await adminAuthClient.auth.admin.inviteUserByEmail(email, {
      data: { role: role } // This is passed in raw_user_meta_data and processed by our trigger
    })

    if (inviteError) throw inviteError

    const invitedUserId = inviteData.user.id

    // 4. Assign repositories if any
    if (repositoryIds && repositoryIds.length > 0) {
      const assignments = repositoryIds.map((repoId: string) => ({
        user_id: invitedUserId,
        repository_id: repoId,
        assigned_by: user.id
      }))

      const { error: assignError } = await supabase
        .from('user_repositories')
        .insert(assignments)

      if (assignError) throw assignError
    }

    return NextResponse.json({ success: true, message: `Invited ${email} as ${role}` })

  } catch (error: any) {
    console.error('Invite error:', error)
    return NextResponse.json({ error: error.message || 'Failed to invite user' }, { status: 500 })
  }
}
