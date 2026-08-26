"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Session, User as SupabaseUser } from "@supabase/supabase-js";

interface Profile {
  id: string;
  name: string;
  role: string; // student, teacher, admin
  grade: string | null;
  grade_taught: string | null;
  language: string;
  created_at: string;
  email_verified: boolean;
  is_active: boolean;
  is_minor: boolean;
  parental_consent_required: boolean;
  parental_consent_given: boolean;
}

interface AuthContextType {
  user: Profile | null;
  session: Session | null;
  loading: boolean;
  isEmailVerified: boolean;
  isAccountActive: boolean;
  needsParentalConsent: boolean;
  logout: () => Promise<void>;
  updateUserLanguage: (lang: string) => Promise<void>;
  updateUserGrade: (grade: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const hasUserRef = React.useRef(false);

  // Keep ref in sync with state
  React.useEffect(() => { hasUserRef.current = !!user; }, [user]);

  const fetchProfile = async (userId: string) => {
    try {
      // Fetch base columns first
      const { data, error } = await supabase
        .from("profiles")
        .select(`id, name, role, grade, grade_taught, language, created_at`)
        .eq("id", userId)
        .single();

      if (error) throw error;

      // Safe defaults for extra columns
      const extraData = {
        email_verified: true,
        is_active: true,
        is_minor: false,
        parental_consent_required: false,
        parental_consent_given: true,
      };

      // Set user immediately with defaults so UI renders fast
      setUser({ ...data, ...extraData });

      // Then try to fetch extra columns without triggering loading state
      try {
        const { data: extra } = await supabase
          .from("profiles")
          .select(`email_verified, is_active, is_minor, parental_consent_required, parental_consent_given`)
          .eq("id", userId)
          .single();
        if (extra) {
          setUser(prev => prev ? {
            ...prev,
            email_verified: extra.email_verified ?? true,
            is_active:      extra.is_active ?? true,
            is_minor:       extra.is_minor ?? false,
            parental_consent_required: extra.parental_consent_required ?? false,
            parental_consent_given:    extra.parental_consent_given ?? true,
          } : null);
        }
      } catch {
        // Extra columns don't exist yet — defaults already applied above
      }
    } catch (e) {
      console.error("Error loading user profile:", e);
      setUser(null);
    }
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }: any) => {
      setSession(session);
      if (session?.user) {
        fetchProfile(session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // Listen to session changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event: any, session: any) => {
      setSession(session);
      if (session?.user) {
        // Use ref (not state) to check if user exists — avoids stale closure bug
        if (!hasUserRef.current) setLoading(true);
        await fetchProfile(session.user.id);
        setLoading(false);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  const updateUserLanguage = async (lang: string) => {
    if (user && session?.user) {
      const { error } = await supabase
        .from("profiles")
        .update({ language: lang })
        .eq("id", session.user.id);

      if (!error) {
        setUser(prev => prev ? { ...prev, language: lang } : null);
      }
    }
  };

  const updateUserGrade = async (grade: string) => {
    if (user && session?.user) {
      const { error } = await supabase
        .from("profiles")
        .update({ grade })
        .eq("id", session.user.id);

      if (!error) {
        setUser(prev => prev ? { ...prev, grade } : null);
      }
    }
  };

  const refreshProfile = async () => {
    if (session?.user) {
      await fetchProfile(session.user.id);
    }
  };

  // Computed values for authentication checks
  const isEmailVerified = user?.email_verified ?? false;
  const isAccountActive = user?.is_active ?? false;
  const needsParentalConsent = (user?.is_minor && user?.parental_consent_required && !user?.parental_consent_given) ?? false;

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      loading, 
      isEmailVerified,
      isAccountActive,
      needsParentalConsent,
      logout, 
      updateUserLanguage, 
      updateUserGrade,
      refreshProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
