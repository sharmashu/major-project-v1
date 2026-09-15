import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { createAdminClient } from '@/utils/supabase/server'
import { generateStructuredCommitAnalysis } from '@/lib/AI Summarizer'

// Helper to verify GitHub webhook signature
function verifySignature(reqBody: string, signature: string | null, secret: string | undefined): boolean {
  if (!signature || !secret) return false;
  const hmac = crypto.createHmac('sha256', secret);
  const digest = 'sha256=' + hmac.update(reqBody).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-hub-signature-256');
    const secret = process.env.GITHUB_WEBHOOK_SECRET;

    if (secret && !verifySignature(rawBody, signature, secret)) {
      return NextResponse.json({ error: 'Unauthorized: Invalid signature' }, { status: 401 });
    }

    const payload = JSON.parse(rawBody);
    const eventType = request.headers.get('x-github-event');

    if (eventType !== 'push') {
      return NextResponse.json({ message: 'Ignored non-push event' });
    }

    const repoFullName = payload.repository.full_name;
    const branch = payload.ref.replace('refs/heads/', '');
    const commits = payload.commits;

    if (!commits || commits.length === 0) {
      return NextResponse.json({ message: 'No commits in push event' });
    }

    const adminSupabase = createAdminClient();

    // Find the repository in our DB
    const { data: repository } = await adminSupabase
      .from('repositories')
      .select('id, private')
      .eq('name', repoFullName)
      .single();

    if (!repository) {
      console.log(`Repository ${repoFullName} not tracked.`);
      return NextResponse.json({ message: 'Repository not tracked' });
    }

    // Try to find a github_token from users connected to this repo
    let githubToken: string | null = null;
    const { data: userRepoLinks } = await adminSupabase
      .from('user_repositories')
      .select('user_id')
      .eq('repository_id', repository.id)
      .limit(10);

    if (userRepoLinks && userRepoLinks.length > 0) {
      const userIds = userRepoLinks.map((r: any) => r.user_id);
      const { data: profiles } = await adminSupabase
        .from('profiles')
        .select('github_token')
        .in('id', userIds)
        .not('github_token', 'is', null)
        .limit(1);
      
      if (profiles && profiles.length > 0) {
        githubToken = profiles[0].github_token;
      }
    }

    // Process each commit
    for (const commit of commits) {
      // 1. Fetch the diff
      const headers: Record<string, string> = {
        'Accept': 'application/vnd.github.v3.diff'
      };
      if (githubToken) {
        headers['Authorization'] = `Bearer ${githubToken}`;
      }

      const diffResponse = await fetch(`https://api.github.com/repos/${repoFullName}/commits/${commit.id}`, {
        headers
      });

      let diffText = '';
      if (diffResponse.ok) {
        diffText = await diffResponse.text();
      } else {
        console.warn(`Could not fetch diff for ${commit.id}: ${diffResponse.statusText}`);
        continue; // Skip if we can't get diff (e.g. private repo and no token)
      }

      // 2. Generate AI structured analysis
      const analysis = await generateStructuredCommitAnalysis(diffText);

      // 3. Insert into commits table
      const commitData = {
        repo_id: repository.id,
        commit_sha: commit.id,
        short_sha: commit.id.substring(0, 7),
        branch: branch,
        author_name: commit.author.name,
        author_email: commit.author.email,
        author_avatar: '', // Webhook payload usually lacks avatar, could fetch from github api
        message: commit.message,
        title: commit.message.split('\n')[0],
        executive_summary: analysis.executive_summary,
        architectural_impact: analysis.architectural_impact,
        breaking_changes: analysis.breaking_changes,
        affected_domains: analysis.affected_domains,
        impact_level: ['Breaking', 'Feature', 'Refactor', 'Security', 'Performance', 'Fix'].includes(analysis.impact_level) ? analysis.impact_level : 'Fix',
        stats: {
          files_changed: commit.added.length + commit.removed.length + commit.modified.length,
          additions: 0, // Git push event doesn't have raw line additions without tree diff
          deletions: 0
        },
        files: [...commit.added, ...commit.removed, ...commit.modified],
        committed_at: commit.timestamp
      };

      const { error: insertError } = await adminSupabase
        .from('commits')
        .insert(commitData);

      if (insertError && insertError.code !== '23505') { // Ignore unique violation if commit already exists
        console.error("Failed to insert commit:", insertError);
      }
    }

    return NextResponse.json({ success: true, message: `Processed ${commits.length} commits` });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
