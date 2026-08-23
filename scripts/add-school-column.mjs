import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const statements = [
  `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS first_name TEXT`,
  `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_name TEXT`,
  `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS school_name TEXT`,
];

for (const sql of statements) {
  const { error } = await supabase.rpc('exec_sql', { sql });
  if (error) console.warn(`⚠️  ${sql.slice(0, 50)}: ${error.message}`);
  else console.log(`✅ ${sql.slice(0, 50)}`);
}

// Verify
const { data, error } = await supabase.from('profiles').select('id, name, first_name, last_name, school_name').limit(3);
if (error) console.error('❌ Verify failed:', error.message);
else console.log('\n📊 Sample profiles:', data);
