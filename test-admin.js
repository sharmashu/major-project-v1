const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://zxuerjvxnytpfpjcbryb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4dWVyanZ4bnl0cGZwamNicnliIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Njk5Njk1NiwiZXhwIjoyMTAyNTcyOTU2fQ.nXiK6CcMteM25yN0LL_y8cdkLbFPbDltgXm4_6dzDuk'
);

async function run() {
  const { data: users, error: usersErr } = await supabase.from('users').select('*');
  const { data: profiles, error: profilesErr } = await supabase.from('profiles').select('*');
  
  console.log("Users Table:");
  console.log("Data:", users);
  console.log("Error:", usersErr?.message || usersErr);

  console.log("\nProfiles Table:");
  console.log("Data:", profiles);
  console.log("Error:", profilesErr?.message || profilesErr);
}

run();
