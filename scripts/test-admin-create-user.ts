import { supabaseAdmin } from '../api/_lib/supabaseAdmin.js';

async function testAdminCreateUser() {
  console.log('Testing admin.createUser...');
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: 'test-anon-dummy@leecv.app',
    password: 'dummy-password-123!',
    email_confirm: true
  });
  
  if (error) {
    console.error('❌ Error creating user:', error.message);
  } else {
    console.log('✅ Created user:', data.user.id);
    // Cleanup
    await supabaseAdmin.auth.admin.deleteUser(data.user.id);
  }
}

testAdminCreateUser();
