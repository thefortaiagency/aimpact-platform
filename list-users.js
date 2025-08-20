const { createClient } = require('@supabase/supabase-js');

// Supabase credentials
const supabaseUrl = 'https://gahcluyygwcbdzbitnwo.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdhaGNsdXl5Z3djYmR6Yml0bndvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDM4NDAzOCwiZXhwIjoyMDY5OTYwMDM4fQ.DvauVy70CCKZXSzxH1OhY_wApc5EU4Spaa5GXSdoNVU';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function listUsers() {
  console.log('Fetching users from Supabase...\n');
  
  try {
    const { data: users, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
      console.error('Error listing users:', error);
      return;
    }
    
    if (users.users.length === 0) {
      console.log('No users found in the database.');
    } else {
      console.log(`Found ${users.users.length} user(s):\n`);
      users.users.forEach((user, index) => {
        console.log(`${index + 1}. Email: ${user.email}`);
        console.log(`   Created: ${new Date(user.created_at).toLocaleDateString()}`);
        console.log(`   Confirmed: ${user.email_confirmed_at ? 'Yes' : 'No'}`);
        console.log(`   Name: ${user.user_metadata?.full_name || user.user_metadata?.name || 'Not set'}`);
        console.log('');
      });
    }
    
    console.log('💡 To reset any user password, you can use the create-test-user.js script');
    console.log('   with the desired email and it will update the password.');
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

listUsers();