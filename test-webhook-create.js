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
  const { data, error } = await supabase.from('profiles').select('email, role, github_token').not('github_token', 'is', null);
  const user = data[0];
  const webhookUrl = env.WEBHOOK_PROXY_URL;
  const webhookSecret = env.GITHUB_WEBHOOK_SECRET;
  const testRepo = "sharmashu/aashu"; // From previous test
  
  console.log(`Attempting to create webhook on ${testRepo}...`);
  
  const createRes = await fetch(`https://api.github.com/repos/${testRepo}/hooks`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${user.github_token}`,
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
    console.log(`SUCCESS! Webhook created on ${testRepo}`);
  } else {
    const errText = await createRes.text();
    console.error(`FAILED to create webhook:`, errText);
    
    // Check if it's already created
    if (errText.includes("already exists")) {
       console.log("Webhook already exists!");
    }
  }
}

test();
