"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Session, User as SupabaseUser } from "@supabase/supabase-js";

interface Profile {
  id: string;
  name: string;
  role: string; // student, teacher, admin, director
  grade: string | null;
  grade_taught: string | null;
  language: string;
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

  const fetchProfile = async (userId: string) => {
    try {
      // Select only the base columns that always exist
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, role, grade, language, is_active")
        .eq("id", userId)
        .single();

      if (error) {
        // PGRST116 = row not found (profile not yet created — race condition after signup)
        if (error.code === "PGRST116") {
          const { data: { session: currentSession } } = await supabase.auth.getSession();
          const meta = currentSession?.user?.user_metadata ?? {};
          setUser({
            id: userId,
            name: meta.name ?? "User",
            role: meta.role ?? "student",
            grade: meta.grade ?? null,
            grade_taught: null,
            language: meta.language ?? "English",
            email_verified: true,
            is_active: true,
            is_minor: meta.is_minor ?? false,
            parental_consent_required: meta.parental_consent_required ?? false,
            parental_consent_given: false,
          });
        } else {
          throw error;
        }
        return;
      }

      // Merge DB data with safe defaults for optional columns
      // email_verified defaults to true since Supabase email confirmation is disabled
      const { data: { session: sess } } = await supabase.auth.getSession();
      const meta = sess?.user?.user_metadata ?? {};
      setUser({
        grade_taught: null,
        email_verified: true,
        is_minor: false,
        parental_consent_required: false,
        parental_consent_given: false,
        is_active: true,
        // fill grade from metadata if DB has null
        grade: meta.grade ?? null,
        language: meta.language ?? "English",
        name: meta.name ?? "User",
        ...data,
      });
    } catch (e) {
      console.error("Error loading user profile:", e);
      // Fall back to session metadata instead of logging user out
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        const meta = currentSession?.user?.user_metadata ?? {};
        if (currentSession?.user) {
          setUser({
            id: userId,
            name: meta.name ?? "User",
            role: meta.role ?? "student",
            grade: meta.grade ?? null,
            grade_taught: null,
            language: meta.language ?? "English",
            email_verified: true,
            is_active: true,
            is_minor: false,
            parental_consent_required: false,
            parental_consent_given: false,
          });
          return;
        }
      } catch {}
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
        setLoading(true);
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
