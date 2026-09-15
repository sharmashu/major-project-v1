const fs = require('fs');
const path = require('path');

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

async function check() {
  const { data: profiles } = await supabase.from('profiles').select('*');
  console.log("PROFILES:", profiles);
  
  const { data: repos } = await supabase.from('repositories').select('*');
  console.log("REPOS:", repos);
  
  const { data: userRepos, error } = await supabase.from('user_repositories').select('*');
  if (error) {
     console.log("ERROR fetching user_repositories:", error);
  }
  console.log("USER_REPOS:", userRepos);
}

check();
