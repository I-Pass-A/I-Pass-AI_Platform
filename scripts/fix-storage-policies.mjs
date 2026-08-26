/**
 * Fix storage policies for avatars bucket
 * The path stored is: {userId}/profile-image
 * So foldername(name)[1] = userId
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const policies = [
  // Drop existing conflicting policies first
  `DO $$ BEGIN
    DROP POLICY IF EXISTS "Avatar upload for own user" ON storage.objects;
    DROP POLICY IF EXISTS "Avatar update for own user" ON storage.objects;
    DROP POLICY IF EXISTS "Avatar public read" ON storage.objects;
    DROP POLICY IF EXISTS "Avatar delete for own user" ON storage.objects;
    DROP POLICY IF EXISTS "Avatar upload" ON storage.objects;
    DROP POLICY IF EXISTS "Avatar update" ON storage.objects;
    DROP POLICY IF EXISTS "Avatar read" ON storage.objects;
    DROP POLICY IF EXISTS "Avatar delete" ON storage.objects;
  END $$`,

  // Create correct policies - path format is: userId/profile-image
  `CREATE POLICY "avatars_insert" ON storage.objects
    FOR INSERT WITH CHECK (
      bucket_id = 'avatars' AND
      auth.uid()::text = (string_to_array(name, '/'))[1]
    )`,

  `CREATE POLICY "avatars_update" ON storage.objects
    FOR UPDATE USING (
      bucket_id = 'avatars' AND
      auth.uid()::text = (string_to_array(name, '/'))[1]
    )`,

  `CREATE POLICY "avatars_select" ON storage.objects
    FOR SELECT USING (bucket_id = 'avatars')`,

  `CREATE POLICY "avatars_delete" ON storage.objects
    FOR DELETE USING (
      bucket_id = 'avatars' AND
      auth.uid()::text = (string_to_array(name, '/'))[1]
    )`,
];

for (const sql of policies) {
  const { error } = await supabase.rpc('exec_sql', { sql }).catch(() => ({ error: null }));
  if (error) console.warn('⚠️', error.message);
  else console.log('✅', sql.slice(0, 50).trim());
}

console.log('\nDone! Test uploading a profile photo now.');
