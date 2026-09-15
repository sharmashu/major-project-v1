import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const contentType = request.headers.get('content-type') || ''
  try {
    const supabase = createClient()

    // 1. Verify caller is a manager
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      if (contentType.includes('application/json')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      return NextResponse.redirect(new URL('/login', request.url), 303)
    }

    const { createAdminClient } = await import('@/utils/supabase/server')
    const adminAuthClient = createAdminClient()

    const { data: profile } = await adminAuthClient
      .from('profiles')
      .select('role, github_token')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'manager') {
      if (contentType.includes('application/json')) return NextResponse.json({ error: 'Forbidden. Only managers can invite.' }, { status: 403 })
      return NextResponse.redirect(new URL('/dashboard?error=Forbidden', request.url), 303)
    }

    // 2. Parse request
    let email: string;
    let role: string;
    let repositoryIds: string[] = [];

    if (contentType.includes('application/json')) {
      const body = await request.json();
      email = body.email;
      role = body.role;
      repositoryIds = body.repositoryIds || [];
    } else {
      const formData = await request.formData();
      email = formData.get('email') as string;
      role = formData.get('role') as string;
      repositoryIds = formData.getAll('repositoryIds') as string[];
    }

    if (!email || !role) {
      if (contentType.includes('application/json')) return NextResponse.json({ error: 'Missing email or role' }, { status: 400 })
      return NextResponse.redirect(new URL('/dashboard?error=Missing+email+or+role', request.url), 303)
    }

    // 3. Admin client to bypass normal auth rules and invite user
    // (Needs SUPABASE_SERVICE_ROLE_KEY to work in prod)

    let invitedUserId: string;
    try {
      const { data: inviteData, error: inviteError } = await adminAuthClient.auth.admin.inviteUserByEmail(email, {
        data: { role: role } // This is passed in raw_user_meta_data and processed by our trigger
      });
      if (inviteError) throw inviteError;
      invitedUserId = inviteData.user.id;
    } catch (inviteErr: any) {
      // If user already exists, Supabase throws an error (often 422). 
      // We can fallback to fetching the existing profile id.
      const { data: existingProfile } = await adminAuthClient
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single();
        
      if (existingProfile) {
        invitedUserId = existingProfile.id;
        console.log(`User ${email} already exists, using existing ID: ${invitedUserId}`);
      } else {
        throw inviteErr;
      }
    }

    // Set the manager_id for the invited user
    const { error: updateManagerError } = await adminAuthClient
      .from('profiles')
      .update({ manager_id: user.id })
      .eq('id', invitedUserId);

    if (updateManagerError) {
      console.error("Failed to set manager_id", updateManagerError);
      // We can continue, but it's good to log
    }

    // 4. Assign repositories if any
    if (repositoryIds && repositoryIds.length > 0) {
      const assignments = [];
      
      for (const repoStr of repositoryIds) {
        let repoObj;
        try {
          repoObj = typeof repoStr === 'string' ? JSON.parse(repoStr) : repoStr;
        } catch (e) {
          console.error("Failed to parse repo string", repoStr);
          continue;
        }

        // Upsert into repositories table
        const { data: upsertedRepo, error: repoError } = await adminAuthClient
          .from('repositories')
          .upsert({
            name: repoObj.name,
            owner: repoObj.name.split('/')[0] || 'unknown',
            url: repoObj.url,
            default_branch: repoObj.default_branch || 'main'
          }, { onConflict: 'name' })
          .select('id')
          .single();

        if (repoError) {
          console.error("Failed to upsert repo", repoError);
          throw repoError;
        }

        // --- AUTOMATIC WEBHOOK CREATION ---
        const webhookUrl = process.env.WEBHOOK_PROXY_URL;
        const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;
        
        if (webhookUrl && webhookSecret && profile?.github_token && repoObj.name) {
          try {
            // First check if it already exists
            const hooksRes = await fetch(`https://api.github.com/repos/${repoObj.name}/hooks`, {
              headers: {
                Authorization: `Bearer ${profile.github_token}`,
                Accept: 'application/vnd.github.v3+json',
              }
            });
            
            if (hooksRes.ok) {
              const hooks = await hooksRes.json();
              const hasWebhook = hooks.some((h: any) => h.config.url === webhookUrl);
              
              if (!hasWebhook) {
                // Create the webhook
                const createRes = await fetch(`https://api.github.com/repos/${repoObj.name}/hooks`, {
                  method: 'POST',
                  headers: {
                    Authorization: `Bearer ${profile.github_token}`,
                    Accept: 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    name: 'web',
                    active: true,
                    events: ['push'],
                    config: {
                      url: webhookUrl,
                      content_type: 'json',
                      secret: webhookSecret,
                      insecure_ssl: '0'
                    }
                  })
                });
                
                if (createRes.ok) {
                  console.log(`Successfully created webhook for ${repoObj.name}`);
                } else {
                  const errText = await createRes.text();
                  console.error(`GitHub API error creating webhook:`, errText);
                }
              } else {
                console.log(`Webhook already exists for ${repoObj.name}`);
              }
            } else {
                const errText = await hooksRes.text();
                console.error(`GitHub API error fetching webhooks:`, errText);
            }
          } catch (hookErr) {
            console.error('Failed to configure GitHub webhook:', hookErr);
            // Non-fatal, continue with invitation
          }
        }
        // ----------------------------------

        assignments.push({
          user_id: invitedUserId,
          repository_id: upsertedRepo.id,
          assigned_by: user.id
        });
      }

      if (assignments.length > 0) {
        const { error: assignError } = await adminAuthClient
          .from('user_repositories')
          .insert(assignments)

        if (assignError) throw assignError
      }
    }

    if (contentType.includes('application/json')) {
      return NextResponse.json({ success: true, message: `Invited ${email} as ${role}` })
    } else {
      return NextResponse.redirect(new URL('/dashboard?message=User+invited+successfully', request.url), 303)
    }

  } catch (error: any) {
    console.error('Invite error:', error)
    if (contentType.includes('application/json')) {
      return NextResponse.json({ error: error.message || 'Failed to invite user' }, { status: 500 })
    } else {
      return NextResponse.redirect(new URL(`/dashboard?error=${encodeURIComponent(error.message || 'Failed')}`, request.url), 303)
    }
  }
}
