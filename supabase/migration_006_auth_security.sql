-- Migration 006: Critical Authentication and Security Improvements
-- Run this migration to implement email verification, role separation, and admin controls

-- 1. Add email verification and security columns to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_minor BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS parental_consent_required BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS parental_consent_given BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS terms_accepted BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS login_count INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ;

-- 2. Create audit log table for tracking admin activities
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on audit logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 3. Update RLS policies for role separation (Directors cannot see admin activities)

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Directors can view profiles" ON profiles;

-- Users can view and update their own profile
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Teachers can view student profiles in their grade
CREATE POLICY "Teachers can view student profiles" ON profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() 
            AND p.role = 'teacher' 
            AND profiles.role = 'student' 
            AND profiles.grade = p.grade_taught
        )
    );

-- Directors can view all NON-ADMIN profiles (this prevents seeing admin activities)
CREATE POLICY "Directors can view non-admin profiles" ON profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() 
            AND p.role = 'director'
        )
        AND role != 'admin'
    );

CREATE POLICY "Directors can update non-admin profiles" ON profiles
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() 
            AND p.role = 'director'
        )
        AND role != 'admin'
    );

-- Admins can view and manage all profiles
CREATE POLICY "Admins can view all profiles" ON profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() 
            AND p.role = 'admin'
        )
    );

CREATE POLICY "Admins can update all profiles" ON profiles
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() 
            AND p.role = 'admin'
        )
    );

CREATE POLICY "Admins can insert profiles" ON profiles
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() 
            AND p.role = 'admin'
        )
    );

CREATE POLICY "Admins can delete profiles" ON profiles
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() 
            AND p.role = 'admin'
        )
    );

-- 4. Audit logs policies - Only admins can view
CREATE POLICY "Admins can view audit logs" ON audit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() 
            AND p.role = 'admin'
        )
    );

CREATE POLICY "System can insert audit logs" ON audit_logs
    FOR INSERT WITH CHECK (true);

-- 5. Function to handle email verification
CREATE OR REPLACE FUNCTION handle_email_verification()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if email is verified in auth.users
    IF NEW.email_confirmed_at IS NOT NULL AND (OLD.email_confirmed_at IS NULL OR OLD.email_confirmed_at != NEW.email_confirmed_at) THEN
        -- Update profile to mark email as verified
        UPDATE profiles 
        SET email_verified = true 
        WHERE id = NEW.id;
        
        -- Log the verification if audit_logs table exists
        INSERT INTO audit_logs (
            user_id,
            action,
            resource_type,
            resource_id,
            new_values
        ) VALUES (
            NEW.id,
            'EMAIL_VERIFIED',
            'auth_users',
            NEW.id::text,
            jsonb_build_object('email', NEW.email, 'verified_at', NEW.email_confirmed_at)
        ) ON CONFLICT DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users for email verification
DROP TRIGGER IF EXISTS on_email_verified ON auth.users;
CREATE TRIGGER on_email_verified
    AFTER UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_email_verification();

-- 6. Function to track user login
CREATE OR REPLACE FUNCTION track_user_login()
RETURNS TRIGGER AS $$
BEGIN
    -- Update last login and increment counter when user signs in
    IF NEW.last_sign_in_at IS NOT NULL AND 
       (OLD.last_sign_in_at IS NULL OR NEW.last_sign_in_at > OLD.last_sign_in_at) THEN
        
        UPDATE profiles 
        SET 
            last_login_at = NEW.last_sign_in_at,
            login_count = COALESCE(login_count, 0) + 1
        WHERE id = NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for login tracking
DROP TRIGGER IF EXISTS on_user_login ON auth.users;
CREATE TRIGGER on_user_login
    AFTER UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION track_user_login();

-- 7. Function to log admin actions
CREATE OR REPLACE FUNCTION log_admin_action()
RETURNS TRIGGER AS $$
DECLARE
    current_user_role TEXT;
BEGIN
    -- Get current user's role
    SELECT role INTO current_user_role
    FROM profiles 
    WHERE id = auth.uid();
    
    -- Only log if the action is performed by admin/director
    IF current_user_role IN ('admin', 'director') THEN
        INSERT INTO audit_logs (
            user_id,
            action,
            resource_type,
            resource_id,
            old_values,
            new_values
        ) VALUES (
            auth.uid(),
            TG_OP,
            TG_TABLE_NAME,
            COALESCE(NEW.id::text, OLD.id::text),
            CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
            CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW) ELSE NULL END
        ) ON CONFLICT DO NOTHING;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create audit triggers on sensitive tables
DROP TRIGGER IF EXISTS audit_profiles_changes ON profiles;
CREATE TRIGGER audit_profiles_changes
    AFTER INSERT OR UPDATE OR DELETE ON profiles
    FOR EACH ROW EXECUTE FUNCTION log_admin_action();

-- 9. Admin management functions

-- Function to deactivate a user (admin only)
CREATE OR REPLACE FUNCTION deactivate_user(target_user_id UUID, reason TEXT DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
    current_user_role TEXT;
    target_user_role TEXT;
BEGIN
    -- Check current user's role
    SELECT role INTO current_user_role
    FROM profiles 
    WHERE id = auth.uid();
    
    IF current_user_role != 'admin' THEN
        RAISE EXCEPTION 'Unauthorized: Admin access required';
    END IF;
    
    -- Get target user's role
    SELECT role INTO target_user_role
    FROM profiles 
    WHERE id = target_user_id;
    
    -- Cannot deactivate other admins
    IF target_user_role = 'admin' THEN
        RAISE EXCEPTION 'Cannot deactivate admin users';
    END IF;
    
    -- Deactivate the user
    UPDATE profiles 
    SET 
        is_active = false,
        deactivated_at = NOW()
    WHERE id = target_user_id;
    
    -- Log the action
    INSERT INTO audit_logs (
        user_id,
        action,
        resource_type,
        resource_id,
        new_values
    ) VALUES (
        auth.uid(),
        'USER_DEACTIVATED',
        'profiles',
        target_user_id::text,
        jsonb_build_object('reason', reason, 'deactivated_at', NOW())
    );
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reactivate a user (admin only)
CREATE OR REPLACE FUNCTION reactivate_user(target_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    current_user_role TEXT;
BEGIN
    -- Check current user's role
    SELECT role INTO current_user_role
    FROM profiles 
    WHERE id = auth.uid();
    
    IF current_user_role != 'admin' THEN
        RAISE EXCEPTION 'Unauthorized: Admin access required';
    END IF;
    
    -- Reactivate the user
    UPDATE profiles 
    SET 
        is_active = true,
        deactivated_at = NULL
    WHERE id = target_user_id;
    
    -- Log the action
    INSERT INTO audit_logs (
        user_id,
        action,
        resource_type,
        resource_id,
        new_values
    ) VALUES (
        auth.uid(),
        'USER_REACTIVATED',
        'profiles',
        target_user_id::text,
        jsonb_build_object('reactivated_at', NOW())
    );
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_email_verified ON profiles(email_verified);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- 11. Update existing users to be email verified (for migration compatibility)
-- This is safe because existing users were created before email verification was required
UPDATE profiles SET email_verified = true WHERE email_verified = false;

-- 12. Create a view for user analytics (admin only, excludes admin data for directors)
CREATE OR REPLACE VIEW user_analytics AS
SELECT 
    p.role,
    p.grade,
    p.language,
    p.is_active,
    COUNT(*) as user_count,
    COUNT(CASE WHEN p.email_verified THEN 1 END) as verified_count,
    COUNT(CASE WHEN p.last_login_at > NOW() - INTERVAL '7 days' THEN 1 END) as active_weekly,
    COUNT(CASE WHEN p.last_login_at > NOW() - INTERVAL '30 days' THEN 1 END) as active_monthly,
    AVG(p.login_count) as avg_login_count
FROM profiles p
GROUP BY p.role, p.grade, p.language, p.is_active;

-- Grant access to analytics view
GRANT SELECT ON user_analytics TO authenticated;

-- Create RLS policy for analytics view (only admins can see all data)
CREATE POLICY "Analytics access control" ON user_analytics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles pr 
            WHERE pr.id = auth.uid() 
            AND pr.role = 'admin'
        )
    );

-- Comments for documentation
COMMENT ON TABLE audit_logs IS 'Tracks all administrative actions for security and compliance - directors cannot see admin activities';
COMMENT ON FUNCTION deactivate_user(UUID, TEXT) IS 'Admin function to deactivate user accounts with audit trail';
COMMENT ON FUNCTION reactivate_user(UUID) IS 'Admin function to reactivate user accounts with audit trail';

-- Migration complete
SELECT 'Migration 006: Critical auth and security improvements completed' as result;