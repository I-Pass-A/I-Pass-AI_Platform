import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Use count: exact to get real total
const { count } = await supabase
  .from('curriculum_chunks')
  .select('*', { count: 'exact', head: true })
  .eq('grade', '12');

console.log(`\nGrade 12 REAL total: ${count} chunks`);

// Get counts per subject using multiple queries
const subjects = ['Agriculture','Biology','Chemistry','Economics','English','Geography','History','IT','Mathematics','Physics'];

for (const subject of subjects) {
  const { count: c } = await supabase
    .from('curriculum_chunks')
    .select('*', { count: 'exact', head: true })
    .eq('grade', '12')
    .eq('subject', subject);
  const bar = '█'.repeat(Math.min(Math.floor((c||0) / 10), 25));
  const status = (c || 0) > 20 ? '✅' : (c || 0) > 0 ? '⚠️ ' : '❌';
  console.log(`  ${status} ${subject.padEnd(15)} ${String(c||0).padStart(4)} chunks  ${bar}`);
}
