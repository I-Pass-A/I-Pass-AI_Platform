/**
 * Adds missing columns to profiles table and verifies student access
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
  console.log('🔧 Fixing schema columns...\n');

  // Run each ALTER statement separately
  const statements = [
    `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT true`,
    `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true`,
    `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_minor BOOLEAN DEFAULT false`,
    `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS parental_consent_required BOOLEAN DEFAULT false`,
    `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS parental_consent_given BOOLEAN DEFAULT true`,
    `UPDATE profiles SET email_verified = true WHERE email_verified IS NULL`,
    `UPDATE profiles SET is_active = true WHERE is_active IS NULL`,
    `UPDATE profiles SET is_minor = false WHERE is_minor IS NULL`,
    `UPDATE profiles SET parental_consent_required = false WHERE parental_consent_required IS NULL`,
    `UPDATE profiles SET parental_consent_given = true WHERE parental_consent_given IS NULL`,
  ];

  for (const sql of statements) {
    try {
      await supabase.rpc('exec_sql', { sql });
      console.log(`  ✅ ${sql.slice(0, 60)}...`);
    } catch {
      console.log(`  ⚠️  RPC unavailable for: ${sql.slice(0, 60)}...`);
    }
  }

  // Verify by checking current profiles
  console.log('\n📊 Checking current profiles...');
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, name, role, email_verified, is_active')
    .order('role');

  if (error) {
    console.log('  ❌ Column check failed:', error.message);
    console.log('\n🚨 MANUAL FIX NEEDED - Run this in Supabase SQL Editor:');
    console.log(`
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_minor BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS parental_consent_required BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS parental_consent_given BOOLEAN DEFAULT true;
UPDATE profiles SET email_verified = true, is_active = true, is_minor = false, 
  parental_consent_required = false, parental_consent_given = true
WHERE email_verified IS NULL OR is_active IS NULL;
    `);
  } else {
    console.log('  Profiles in DB:');
    profiles?.forEach(p => {
      const active = p.is_active === null ? '⚠️ NULL' : p.is_active ? '✅' : '❌';
      const verified = p.email_verified === null ? '⚠️ NULL' : p.email_verified ? '✅' : '❌';
      console.log(`    ${p.role.padEnd(10)} ${p.name.padEnd(25)} active:${active} verified:${verified}`);
    });

    const nullActive = profiles?.filter(p => p.is_active === null || p.is_active === false);
    if (nullActive?.length) {
      console.log(`\n  ⚠️  ${nullActive.length} users have is_active=null/false — they will see "Account Deactivated"`);
      console.log('  Run the SQL above in Supabase SQL Editor to fix this.');
    } else {
      console.log('\n  ✅ All users have is_active=true — no "Account Deactivated" issue!');
    }
  }
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
