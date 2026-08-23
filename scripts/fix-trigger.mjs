import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const sql = `CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (
    id, name, role, grade, grade_taught, language,
    email_verified, is_active, is_minor,
    parental_consent_required, parental_consent_given
  )
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'name', 'New User'),
    COALESCE(new.raw_user_meta_data->>'role', 'student'),
    new.raw_user_meta_data->>'grade',
    new.raw_user_meta_data->>'grade_taught',
    COALESCE(new.raw_user_meta_data->>'language', 'English'),
    true, true, false, false, true
  );
  RETURN new;
END;
$$ language plpgsql security definer;`;

const { error } = await supabase.rpc('exec_sql', { sql });
if (error) {
  console.error('❌ Trigger update failed:', error.message);
} else {
  console.log('✅ handle_new_user trigger updated — new signups will get is_active=true automatically');
}
