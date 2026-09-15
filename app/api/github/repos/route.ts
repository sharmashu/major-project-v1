import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()
    const { data: profile } = await adminClient
      .from('profiles')
      .select('github_token')
      .eq('id', user.id)
      .single()

    if (!profile?.github_token) {
      return NextResponse.json({ error: 'GitHub token not found. Please log in with GitHub again.' }, { status: 400 })
    }

    const githubResponse = await fetch('https://api.github.com/user/repos?per_page=100&affiliation=owner,collaborator,organization_member', {
      headers: {
        Authorization: `Bearer ${profile.github_token}`,
        Accept: 'application/vnd.github.v3+json'
      }
    })

    if (!githubResponse.ok) {
      console.error('GitHub API error:', await githubResponse.text())
      return NextResponse.json({ error: 'Failed to fetch repositories from GitHub' }, { status: 502 })
    }

    const repos = await githubResponse.json()
    
    // Format the response to be cleaner
    const formattedRepos = repos.map((repo: any) => ({
      id: repo.id.toString(),
      name: repo.full_name,
      private: repo.private,
      url: repo.html_url,
      default_branch: repo.default_branch
    }))

    return NextResponse.json({ repositories: formattedRepos })

  } catch (error: any) {
    console.error('Error fetching GitHub repos:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
