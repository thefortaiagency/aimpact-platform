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

async function createTestUser() {
  console.log('Creating test user...');
  
  const email = 'test@aimpactnexus.ai';
  const password = 'TestPassword123!';
  
  try {
    // First, try to sign up the user
    const { data: signUpData, error: signUpError } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Auto-confirm the email
      user_metadata: {
        full_name: 'Test User',
      }
    });
    
    if (signUpError) {
      if (signUpError.message.includes('already registered')) {
        console.log('User already exists. Updating password...');
        
        // If user exists, update their password
        const { data: users, error: listError } = await supabase.auth.admin.listUsers();
        if (listError) {
          console.error('Error listing users:', listError);
          return;
        }
        
        const existingUser = users.users.find(u => u.email === email);
        if (existingUser) {
          const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
            existingUser.id,
            { password: password }
          );
          
          if (updateError) {
            console.error('Error updating password:', updateError);
          } else {
            console.log('✅ Password updated successfully!');
          }
        }
      } else {
        console.error('Error creating user:', signUpError);
        return;
      }
    } else {
      console.log('✅ User created successfully!');
    }
    
    console.log('\n📧 Login Credentials:');
    console.log('   Email:', email);
    console.log('   Password:', password);
    console.log('\n🌐 Login at: https://aimpact-platform.vercel.app/login');
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

createTestUser();