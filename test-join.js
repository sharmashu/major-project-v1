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

// We simulate a user logging in by grabbing the user's ID
// Since we don't have their password, we can't fully simulate the JWT easily without some work.
// But we can just use the service role key for now to see if the JOIN works.
const adminClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function testJoin() {
  const userId = '6bbaa924-050f-41d6-84c7-960a5878d63b'; // deepanshu0203@gmail.com

  console.log("Testing user_repositories join...");
  const { data, error } = await adminClient
    .from('user_repositories')
    .select('repository_id, repositories(name, url)')
    .eq('user_id', userId);
    
  if (error) {
     console.error("Join Error:", error);
  } else {
     console.log("Join Result (Admin):", JSON.stringify(data, null, 2));
  }
}

testJoin();
