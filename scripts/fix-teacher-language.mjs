/**
 * Fix teacher language based on their grade_taught
 * Grade 6 & 8 teachers → Afaan Oromo
 * Grade 12 teachers    → English
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function main() {
  console.log('🔧 Fixing teacher language settings...\n');

  const { data: teachers } = await supabase
    .from('profiles')
    .select('id, name, role, grade_taught, language')
    .eq('role', 'teacher');

  for (const teacher of teachers || []) {
    const correctLang = (teacher.grade_taught === '6' || teacher.grade_taught === '8')
      ? 'Afaan Oromo'
      : 'English';

    if (teacher.language !== correctLang) {
      await supabase
        .from('profiles')
        .update({ language: correctLang })
        .eq('id', teacher.id);
      console.log(`  ✅ ${teacher.name} (Grade ${teacher.grade_taught}): ${teacher.language} → ${correctLang}`);
    } else {
      console.log(`  ✓  ${teacher.name} (Grade ${teacher.grade_taught}): already ${correctLang}`);
    }
  }

  console.log('\n✅ Done!');
}

main().catch(e => { console.error(e); process.exit(1); });
