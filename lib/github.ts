import { createClient, createAdminClient } from "@/utils/supabase/server";

export async function getGithubTokenForRepo(repoUrl: string): Promise<string | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const adminAuthClient = createAdminClient();

  // First check if user has their own token
  const { data: profile } = await adminAuthClient
    .from('profiles')
    .select('github_token')
    .eq('id', user.id)
    .single();

  if (profile?.github_token) {
    return profile.github_token;
  }

  // If no personal token, check if they are assigned this repo
  const { data: userRepo } = await adminAuthClient
    .from('user_repositories')
    .select('assigned_by, repositories!inner(url)')
    .eq('user_id', user.id)
    .eq('repositories.url', repoUrl)
    .single();

  if (userRepo?.assigned_by) {
    const { data: managerProfile } = await adminAuthClient
      .from('profiles')
      .select('github_token')
      .eq('id', userRepo.assigned_by)
      .single();
      
    if (managerProfile?.github_token) {
      return managerProfile.github_token;
    }
  }

  return null;
}

export async function fetchCommitDiff(repoUrl: string, sha: string, token: string | null): Promise<string> {
  try {
    const urlObj = new URL(repoUrl);
    const pathParts = urlObj.pathname.split("/").filter(Boolean);
    if (pathParts.length < 2) throw new Error("Invalid repo URL");

    const owner = pathParts[0];
    const repo = pathParts[1];

    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/commits/${sha}`;
    
    const headers: Record<string, string> = {
      "Accept": "application/vnd.github.v3.diff",
      "User-Agent": "GitSimple-App"
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(apiUrl, { headers });
    
    if (!response.ok) {
      if (response.status === 404) throw new Error("Repository not found or is private.");
      if (response.status === 403) throw new Error("GitHub API rate limit exceeded.");
      throw new Error(`GitHub API returned ${response.status}`);
    }

    const diffText = await response.text();
    return diffText;
  } catch (error) {
    console.error("Error fetching commit diff:", error);
    throw error;
  }
}
