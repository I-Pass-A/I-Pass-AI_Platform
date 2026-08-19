-- ============================================================
-- Migration 004 FIX — Remove recursive policy on profiles
-- The director policy on profiles caused infinite recursion
-- because it queries profiles from within a profiles policy.
-- Fix: use auth.jwt() to check role from the JWT token instead.
-- ============================================================

-- Drop the recursive policy
DROP POLICY IF EXISTS "Directors can read all profiles" ON public.profiles;

-- Replace with a non-recursive version using JWT claims
-- Supabase stores user_metadata in the JWT, accessible via auth.jwt()
CREATE POLICY "Directors can read all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'director'
    OR auth.uid() = id  -- users can always read their own profile
  );

-- Also fix the other director policies to use JWT instead of subquery
DROP POLICY IF EXISTS "Directors can read all tutor sessions" ON public.tutor_sessions;
CREATE POLICY "Directors can read all tutor sessions"
  ON public.tutor_sessions FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'director'
  );

DROP POLICY IF EXISTS "Directors can read all exam attempts" ON public.exam_attempts;
CREATE POLICY "Directors can read all exam attempts"
  ON public.exam_attempts FOR SELECT
  TO authenticated
  USING (
    auth.uid() = student_id
    OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'director'
    OR (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'teacher')
  );

DROP POLICY IF EXISTS "Directors can read all assignments" ON public.teacher_assignments;
CREATE POLICY "Directors can read all assignments"
  ON public.teacher_assignments FOR SELECT
  TO authenticated
  USING (
    auth.uid() = teacher_id
    OR published = true
    OR (auth.jwt() -> 'user_metadata' ->> 'role') IN ('director', 'admin')
  );

DROP POLICY IF EXISTS "Directors can read all submissions" ON public.assignment_submissions;
CREATE POLICY "Directors can read all submissions"
  ON public.assignment_submissions FOR SELECT
  TO authenticated
  USING (
    auth.uid() = student_id
    OR (auth.jwt() -> 'user_metadata' ->> 'role') IN ('director', 'admin')
    OR EXISTS (
      SELECT 1 FROM public.teacher_assignments ta
      WHERE ta.id = assignment_id AND ta.teacher_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Directors can read all curriculum chunks" ON public.curriculum_chunks;
CREATE POLICY "Directors can read all curriculum chunks"
  ON public.curriculum_chunks FOR SELECT
  TO authenticated
  USING (true);
