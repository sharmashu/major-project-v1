const fs = require('fs');
const path = require('path');

// Load env
const envContent = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim();
  }
});

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  console.log("Checking DB for profiles with github_token...");
  const { data, error } = await supabase.from('profiles').select('email, role, github_token').not('github_token', 'is', null);

  if (error) {
    console.error("DB Error:", error);
    return;
  }

  if (!data || data.length === 0) {
    console.log("No users found with a github_token! You need to log out and log in with GitHub again.");
    return;
  }

  const user = data[0];
  console.log(`Found token for user: ${user.email} (Role: ${user.role})`);

  console.log("Testing GitHub API to fetch webhooks...");

  // Try fetching repos first to see if token works
  const repoRes = await fetch(`https://api.github.com/user/repos?per_page=1`, {
    headers: {
      Authorization: `Bearer ${user.github_token}`,
      Accept: 'application/vnd.github.v3+json',
    }
  });

  if (!repoRes.ok) {
    console.error("Failed to fetch repos with token:", await repoRes.text());
    return;
  }

  const repos = await repoRes.json();
  if (repos.length === 0) {
    console.log("User has no repos!");
    return;
  }

  const testRepo = repos[0].full_name;
  console.log(`Testing webhook permissions on repo: ${testRepo}`);

  const hooksRes = await fetch(`https://api.github.com/repos/${testRepo}/hooks`, {
    headers: {
      Authorization: `Bearer ${user.github_token}`,
      Accept: 'application/vnd.github.v3+json',
    }
  });

  if (hooksRes.ok) {
    console.log(`SUCCESS! The token has permission to read webhooks on ${testRepo}.`);
    console.log(`Webhook URL loaded from env: ${env.WEBHOOK_PROXY_URL}`);
    console.log(`Webhook Secret loaded from env: ${env.GITHUB_WEBHOOK_SECRET}`);
    console.log("If it failed during the invite, check if you restarted your Next.js server!");
  } else {
    console.error("FAILED to read webhooks! Error from GitHub:", await hooksRes.text());
    console.log("This usually means your GitHub token is missing the 'admin:repo_hook' or 'repo' scope. Try revoking the OAuth app in your GitHub settings and logging in again.");
  }
}

test();
