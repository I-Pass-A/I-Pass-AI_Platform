/**
 * Resend confirmation email to a specific user
 * Usage: node scripts/resend-confirmation.mjs email@example.com
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });

const email = process.argv[2];
if (!email) { console.error('Usage: node scripts/resend-confirmation.mjs email@example.com'); process.exit(1); }

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const { error } = await supabase.auth.resend({ type: 'signup', email });
if (error) console.error('Failed:', error.message);
else console.log(`✅ Confirmation email resent to ${email}`);
