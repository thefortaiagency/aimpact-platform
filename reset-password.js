const { createClient } = require('@supabase/supabase-js');
const readline = require('readline');
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

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function resetPassword() {
  console.log('🔐 Password Reset Tool for AImpact Platform\n');
  
  const email = await askQuestion('Enter email address: ');
  const newPassword = await askQuestion('Enter new password: ');
  
  console.log('\nResetting password...');
  
  try {
    // First, find the user
    const { data: users, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) {
      console.error('Error listing users:', listError);
      rl.close();
      return;
    }
    
    const user = users.users.find(u => u.email === email);
    if (!user) {
      console.error('❌ User not found with email:', email);
      rl.close();
      return;
    }
    
    // Update the password
    const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    );
    
    if (updateError) {
      console.error('❌ Error updating password:', updateError);
    } else {
      console.log('✅ Password reset successfully!');
      console.log('\n📧 Updated Login Credentials:');
      console.log('   Email:', email);
      console.log('   Password:', newPassword);
      console.log('\n🌐 Login at: https://aimpact-platform.vercel.app/login');
      console.log('   or at: https://impact.aimpactnexus.ai (once DNS propagates)');
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
  } finally {
    rl.close();
  }
}

resetPassword();