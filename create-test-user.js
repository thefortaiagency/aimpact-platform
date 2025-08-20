const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Supabase credentials from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables!');
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env file');
  process.exit(1);
}

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