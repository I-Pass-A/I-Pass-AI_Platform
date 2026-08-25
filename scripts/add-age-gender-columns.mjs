import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const statements = [
  `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS age INTEGER`,
  `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('male','female','other','prefer_not_to_say'))`,
];

for (const sql of statements) {
  const { error } = await supabase.rpc('exec_sql', { sql });
  if (error) console.warn(`⚠️  ${sql.slice(0, 50)}: ${error.message}`);
  else console.log(`✅ ${sql.slice(0, 50)}`);
}

const { data } = await supabase.from('profiles').select('id, name, age, gender').limit(3);
console.log('\nSample profiles:', data);
