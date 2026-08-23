/**
 * Reset & Seed Script
 * - Deletes ALL users, exams, tutor sessions, messages
 * - Creates the 5 official staff accounts
 * - Students sign up themselves
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ── Official accounts to create ──────────────────────────────────────────────
const STAFF = [
  { email: 'admin@ipassa.edu.et',       password: 'Admin@IPassA2025',    name: 'System Admin',     role: 'admin',    grade: null, grade_taught: null },
  { email: 'director@ipassa.edu.et',    password: 'Director@IPassA2025', name: 'School Director',  role: 'director', grade: null, grade_taught: null },
  { email: 'teacher12@ipassa.edu.et',   password: 'Teacher@IPassA2025',  name: 'Grade 12 Teacher', role: 'teacher',  grade: null, grade_taught: '12' },
  { email: 'teacher6@ipassa.edu.et',    password: 'Teacher6@IPassA2025', name: 'Grade 6 Teacher',  role: 'teacher',  grade: null, grade_taught: '6'  },
  { email: 'teacher8@ipassa.edu.et',    password: 'Teacher8@IPassA2025', name: 'Grade 8 Teacher',  role: 'teacher',  grade: null, grade_taught: '8'  },
];

async function run() {
  console.log('🚀 Starting reset & seed...\n');

  // ── Step 1: Clear all data tables ─────────────────────────────────────────
  console.log('🗑️  Clearing data tables...');
  const tables = ['tutor_messages', 'tutor_sessions', 'exam_attempts', 'assignment_submissions', 'teacher_assignments', 'exams'];
  for (const table of tables) {
    const { error } = await supabase.from(table).delete().neq('id', 0);
    if (error) console.warn(`  ⚠️  ${table}: ${error.message}`);
    else console.log(`  ✅ ${table} cleared`);
  }

  // ── Step 2: Delete ALL existing auth users ────────────────────────────────
  console.log('\n👥 Deleting all existing users...');
  const { data: { users }, error: listErr } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (listErr) { console.error('Failed to list users:', listErr.message); process.exit(1); }

  for (const u of users) {
    const { error } = await supabase.auth.admin.deleteUser(u.id);
    if (error) console.warn(`  ⚠️  ${u.email}: ${error.message}`);
    else console.log(`  🗑️  Deleted ${u.email}`);
  }

  // ── Step 3: Create official staff accounts ────────────────────────────────
  console.log('\n✨ Creating official staff accounts...');
  for (const staff of STAFF) {
    // Create auth user
    const { data, error: createErr } = await supabase.auth.admin.createUser({
      email: staff.email,
      password: staff.password,
      email_confirm: true,   // skip email verification
      user_metadata: {
        name: staff.name,
        role: staff.role,
        grade: staff.grade,
        grade_taught: staff.grade_taught,
        language: 'English',
      }
    });

    if (createErr) {
      console.error(`  ❌ ${staff.email}: ${createErr.message}`);
      continue;
    }

    // Upsert profile manually (trigger may not fire via admin API)
    const { error: profileErr } = await supabase.from('profiles').upsert({
      id: data.user.id,
      name: staff.name,
      role: staff.role,
      grade: staff.grade,
      grade_taught: staff.grade_taught,
      language: 'English',
    }, { onConflict: 'id' });

    if (profileErr) console.warn(`  ⚠️  Profile for ${staff.email}: ${profileErr.message}`);
    else console.log(`  ✅ ${staff.email} (${staff.role})`);
  }

  // ── Step 4: Verify ────────────────────────────────────────────────────────
  console.log('\n📊 Final database state:');
  const { data: profiles } = await supabase.from('profiles').select('name, role, grade_taught').order('role');
  profiles?.forEach(p => console.log(`  • ${p.name} — ${p.role}${p.grade_taught ? ` (Grade ${p.grade_taught})` : ''}`));

  console.log('\n🎉 Done! Login credentials:');
  STAFF.forEach(s => console.log(`  ${s.role.padEnd(10)} ${s.email.padEnd(30)} ${s.password}`));
  console.log('  student    Sign up on the website');
}

run().catch(err => { console.error(err); process.exit(1); });
