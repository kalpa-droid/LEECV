
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing env vars');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function runSpike() {
  console.log('Testing Supabase signInAnonymously...');
  
  try {
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) {
      console.error('❌ Spike Failed: Error signing in anonymously:', error.message);
      process.exit(1);
    }
    console.log('✅ Spike Success: Anonymous sign-in works!');
    console.log('User ID:', data.user?.id);
    console.log('Is Anonymous:', data.user?.is_anonymous);
  } catch (err) {
    console.error('❌ Spike Failed: Exception thrown:', err);
    process.exit(1);
  }
}

runSpike();
