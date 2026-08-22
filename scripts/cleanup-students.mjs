#!/usr/bin/env node

/**
 * Cleanup Students Script
 * Removes ONLY student users from the database
 * Keeps admin and teacher accounts safe
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function cleanupStudents() {
  try {
    console.log('🔍 Finding student users to remove...');
    
    // First, get all student profiles
    const { data: students, error: studentsError } = await supabase
      .from('profiles')
      .select('id, name, role, grade')
      .eq('role', 'student');

    if (studentsError) {
      throw studentsError;
    }

    if (!students || students.length === 0) {
      console.log('✅ No student users found in database');
      return;
    }

    console.log(`📊 Found ${students.length} student users:`);
    students.forEach((student, index) => {
      console.log(`  ${index + 1}. ${student.name} (Grade ${student.grade}) - ID: ${student.id}`);
    });

    console.log('\n🗑️ Removing student users...');

    let successCount = 0;
    let errorCount = 0;

    for (const student of students) {
      try {
        // Delete from auth.users (this will cascade delete from profiles due to foreign key)
        const { error: deleteError } = await supabase.auth.admin.deleteUser(student.id);
        
        if (deleteError) {
          console.error(`❌ Failed to delete ${student.name}: ${deleteError.message}`);
          errorCount++;
        } else {
          console.log(`✅ Deleted ${student.name} (Grade ${student.grade})`);
          successCount++;
        }
      } catch (err) {
        console.error(`❌ Error deleting ${student.name}:`, err.message);
        errorCount++;
      }
    }

    console.log('\n📊 Cleanup Summary:');
    console.log(`✅ Successfully removed: ${successCount} students`);
    console.log(`❌ Failed to remove: ${errorCount} students`);

    // Verify remaining users
    const { data: remainingUsers } = await supabase
      .from('profiles')
      .select('id, name, role')
      .order('role');

    if (remainingUsers && remainingUsers.length > 0) {
      console.log('\n👥 Remaining users in database:');
      remainingUsers.forEach((user, index) => {
        console.log(`  ${index + 1}. ${user.name} (${user.role})`);
      });
    } else {
      console.log('\n📭 No users remaining in database');
    }

    console.log('\n🎉 Student cleanup completed!');
    console.log('💡 You can now sign up fresh student accounts');

  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
    process.exit(1);
  }
}

// Safety check
console.log('⚠️  STUDENT CLEANUP SCRIPT');
console.log('🎯 This will remove ALL student users from the database');
console.log('✅ Admin and teacher accounts will be preserved');
console.log('⚠️  This action cannot be undone');

// Run the cleanup
cleanupStudents();