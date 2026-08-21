-- Migration 005: Authentication and Authorization Improvements
-- Implements email verification, role separation, and admin controls

-- 1. Update profiles table for enhanced user management
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_minor BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS parental_consent_required BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS parental_consent_given BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS parental_consent_date TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS terms_accepted BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS login_count INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS deactivated_by UUID REFERENCES profiles(id);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id);

-- 2. Create audit log table for admin activities
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

-- 3. Create user sessions table for tracking active sessions
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    session_token TEXT UNIQUE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_accessed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on user sessions
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- 4. Create parental consent requests table
CREATE TABLE IF NOT EXISTS parental_consent_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    parent_name TEXT NOT NULL,
    parent_email TEXT NOT NULL,
    student_name TEXT NOT NULL,
    student_grade TEXT NOT NULL,
    consent_token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
    status TEXT CHECK (status IN ('pending', 'approved', 'denied', 'expired')) DEFAULT 'pending',
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    responded_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
    response_notes TEXT
);

-- Enable RLS on parental consent
ALTER TABLE parental_consent_requests ENABLE ROW LEVEL SECURITY;

-- 5. Update RLS policies for enhanced security

-- Profiles: Directors cannot see admin activities, users can only see their own data
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;

-- New profile policies with role separation
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Teachers can view student profiles in their grade" ON profiles
    FOR SELECT USING (
        auth.jwt() ->> 'role' = 'teacher' 
        AND role = 'student' 
        AND grade = (
            SELECT grade_taught 
            FROM profiles 
            WHERE id = auth.uid()
        )
    );

CREATE POLICY "Directors can view all non-admin profiles" ON profiles
    FOR SELECT USING (
        auth.jwt() ->> 'role' = 'director' 
        AND role != 'admin'
    );

CREATE POLICY "Directors can update non-admin profiles" ON profiles
    FOR UPDATE USING (
        auth.jwt() ->> 'role' = 'director' 
        AND role != 'admin'
    );

CREATE POLICY "Admins can view all profiles" ON profiles
    FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admins can update all profiles" ON profiles
    FOR UPDATE USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admins can insert profiles" ON profiles
    FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admins can delete profiles" ON profiles
    FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');

-- Audit logs: Only admins can view, automatic logging for admin actions
CREATE POLICY "Admins can view audit logs" ON audit_logs
    FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "System can insert audit logs" ON audit_logs
    FOR INSERT WITH CHECK (true);

-- User sessions: Users can view own sessions, admins can view all
CREATE POLICY "Users can view own sessions" ON user_sessions
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can view all sessions" ON user_sessions
    FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "System can manage sessions" ON user_sessions
    FOR ALL USING (true);

-- Parental consent: Students can view their requests, admins can manage all
CREATE POLICY "Students can view own consent requests" ON parental_consent_requests
    FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Admins can manage all consent requests" ON parental_consent_requests
    FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- 6. Create functions for audit logging

-- Function to log admin actions
CREATE OR REPLACE FUNCTION log_admin_action()
RETURNS TRIGGER AS $$
BEGIN
    -- Only log if the action is performed by admin/director
    IF (auth.jwt() ->> 'role') IN ('admin', 'director') THEN
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
        );
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create triggers for audit logging on sensitive tables

-- Audit profile changes
DROP TRIGGER IF EXISTS audit_profiles_changes ON profiles;
CREATE TRIGGER audit_profiles_changes
    AFTER INSERT OR UPDATE OR DELETE ON profiles
    FOR EACH ROW EXECUTE FUNCTION log_admin_action();

-- Audit curriculum uploads
DROP TRIGGER IF EXISTS audit_documents_changes ON documents;
CREATE TRIGGER audit_documents_changes
    AFTER INSERT OR UPDATE OR DELETE ON documents
    FOR EACH ROW EXECUTE FUNCTION log_admin_action();

-- 8. Function to handle email verification
CREATE OR REPLACE FUNCTION handle_email_verification()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if email is verified in auth.users
    IF NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL THEN
        -- Update profile to mark email as verified
        UPDATE profiles 
        SET email_verified = true 
        WHERE id = NEW.id;
        
        -- Log the verification
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
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users for email verification
DROP TRIGGER IF EXISTS on_email_verified ON auth.users;
CREATE TRIGGER on_email_verified
    AFTER UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_email_verification();

-- 9. Function to update login tracking
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

-- 10. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type ON audit_logs(resource_type);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_session_token ON user_sessions(session_token);

CREATE INDEX IF NOT EXISTS idx_parental_consent_student_id ON parental_consent_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_parental_consent_status ON parental_consent_requests(status);
CREATE INDEX IF NOT EXISTS idx_parental_consent_expires_at ON parental_consent_requests(expires_at);

CREATE INDEX IF NOT EXISTS idx_profiles_email_verified ON profiles(email_verified);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- 11. Create admin management functions

-- Function to deactivate a user (admin only)
CREATE OR REPLACE FUNCTION deactivate_user(target_user_id UUID, reason TEXT DEFAULT NULL)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if current user is admin
    IF (auth.jwt() ->> 'role') != 'admin' THEN
        RAISE EXCEPTION 'Unauthorized: Admin access required';
    END IF;
    
    -- Cannot deactivate other admins
    IF (SELECT role FROM profiles WHERE id = target_user_id) = 'admin' THEN
        RAISE EXCEPTION 'Cannot deactivate admin users';
    END IF;
    
    -- Deactivate the user
    UPDATE profiles 
    SET 
        is_active = false,
        deactivated_at = NOW(),
        deactivated_by = auth.uid()
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
BEGIN
    -- Check if current user is admin
    IF (auth.jwt() ->> 'role') != 'admin' THEN
        RAISE EXCEPTION 'Unauthorized: Admin access required';
    END IF;
    
    -- Reactivate the user
    UPDATE profiles 
    SET 
        is_active = true,
        deactivated_at = NULL,
        deactivated_by = NULL
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

-- 12. Create view for user analytics (admin only)
CREATE OR REPLACE VIEW admin_user_analytics AS
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
WHERE p.role != 'admin'  -- Directors cannot see admin stats
GROUP BY p.role, p.grade, p.language, p.is_active;

-- Grant access to admin analytics view
GRANT SELECT ON admin_user_analytics TO authenticated;

-- Create RLS policy for admin analytics
CREATE POLICY "Admins can view user analytics" ON admin_user_analytics
    FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');

-- 13. Comments for documentation
COMMENT ON TABLE audit_logs IS 'Tracks all administrative actions for security and compliance';
COMMENT ON TABLE user_sessions IS 'Tracks active user sessions for security monitoring';
COMMENT ON TABLE parental_consent_requests IS 'Manages COPPA compliance for users under 13';
COMMENT ON FUNCTION deactivate_user(UUID, TEXT) IS 'Admin function to deactivate user accounts with audit trail';
COMMENT ON FUNCTION reactivate_user(UUID) IS 'Admin function to reactivate user accounts with audit trail';
COMMENT ON VIEW admin_user_analytics IS 'Provides user statistics for admin dashboard (directors cannot see admin activities)';

-- Migration complete
SELECT 'Migration 005: Auth improvements completed successfully' as result;