"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";

import { supabase } from "@/lib/supabase";

import type {
  AuthChangeEvent,
  Session,
} from "@supabase/supabase-js";

export interface Profile {
  id: string;
  name: string;
  role: string;
  grade: string | null;
  language: string;
  created_at?: string;
}

interface AuthContextType {
  user: Profile | null;
  session: Session | null;
  loading: boolean;

  logout: () => Promise<void>;

  updateUserLanguage: (lang: string) => Promise<void>;

  updateUserGrade: (grade: string) => Promise<void>;

  refreshProfile: () => Promise<void>;
}

const AuthContext =
  createContext<AuthContextType | undefined>(
    undefined
  );

export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] =
    useState<Profile | null>(null);

  const [session, setSession] =
    useState<Session | null>(null);

  const [loading, setLoading] =
    useState(true);

  /*
  =========================================================
  FETCH PROFILE
  =========================================================
  */

  const fetchProfile = useCallback(
    async (userId: string) => {
      console.log(
        "Fetching profile for:",
        userId
      );

      try {
        const {
          data,
          error,
        } = await supabase
          .from("profiles")
          .select(
            "id, name, role, grade, language, created_at"
          )
          .eq("id", userId)
          .maybeSingle();

        if (error) {
          console.error(
            "PROFILE DATABASE ERROR:",
            {
              message: error.message,
              code: error.code,
              details: error.details,
              hint: error.hint,
            }
          );

          /*
          Do NOT logout the user because
          the profile query failed.
          */

          setUser(null);

          return null;
        }

        /*
        PROFILE FOUND
        */

        if (data) {
          console.log(
            "PROFILE FOUND:",
            data
          );

          setUser(data as Profile);

          return data as Profile;
        }

        /*
        PROFILE DOES NOT EXIST
        */

        console.log(
          "Profile not found. Creating profile..."
        );

        const {
          data: authData,
          error: authError,
        } =
          await supabase.auth.getUser();

        if (authError) {
          console.error(
            "GET USER ERROR:",
            authError
          );

          return null;
        }

        const authUser =
          authData.user;

        if (!authUser) {
          console.error(
            "No authenticated user found."
          );

          return null;
        }

        const metadata =
          authUser.user_metadata || {};

        /*
        Normalize role
        */

        const rawRole =
          String(
            metadata.role ||
              "student"
          ).toLowerCase();

        let role = "student";

        if (
          rawRole === "admin" ||
          rawRole === "administrator" ||
          rawRole ===
            "content administrator"
        ) {
          role = "admin";
        } else if (
          rawRole === "teacher"
        ) {
          role = "teacher";
        }

        const profileToCreate = {
          id: authUser.id,

          name:
            metadata.name ||
            authUser.email?.split(
              "@"
            )[0] ||
            "New User",

          role,

          grade:
            metadata.grade ||
            null,

          language:
            metadata.language ||
            "English",
        };

        console.log(
          "Creating profile:",
          profileToCreate
        );

        const {
          data: createdProfile,
          error: createError,
        } =
          await supabase
            .from("profiles")
            .insert(
              profileToCreate
            )
            .select(
              "id, name, role, grade, language, created_at"
            )
            .single();

        if (createError) {
          console.error(
            "PROFILE CREATION ERROR:",
            {
              message:
                createError.message,
              code:
                createError.code,
              details:
                createError.details,
              hint:
                createError.hint,
            }
          );

          return null;
        }

        console.log(
          "PROFILE CREATED:",
          createdProfile
        );

        setUser(
          createdProfile as Profile
        );

        return createdProfile as Profile;
      } catch (error) {
        console.error(
          "FETCH PROFILE UNEXPECTED ERROR:",
          error
        );

        return null;
      }
    },
    []
  );

  /*
  =========================================================
  INITIAL AUTH
  =========================================================
  */

  useEffect(() => {
    let mounted = true;

    const initializeAuth =
      async () => {
        try {
          console.log(
            "Initializing Supabase authentication..."
          );

          const {
            data,
            error,
          } =
            await supabase.auth.getSession();

          if (error) {
            console.error(
              "GET SESSION ERROR:",
              error
            );

            if (mounted) {
              setSession(null);
              setUser(null);
            }

            return;
          }

          const currentSession =
            data.session;

          if (!mounted) return;

          setSession(
            currentSession
          );

          /*
          User already logged in
          */

          if (
            currentSession?.user
          ) {
            await fetchProfile(
              currentSession.user.id
            );
          }
        } catch (error) {
          console.error(
            "INITIAL AUTH ERROR:",
            error
          );
        } finally {
          if (mounted) {
            setLoading(false);
          }
        }
      };

    initializeAuth();

    /*
    =======================================================
    AUTH LISTENER

    IMPORTANT:
    Don't await Supabase database operations directly
    inside onAuthStateChange.
    =======================================================
    */

    const {
      data: authListener,
    } =
      supabase.auth.onAuthStateChange(
        (
          event: AuthChangeEvent,
          newSession: Session | null
        ) => {
          console.log(
            "AUTH EVENT:",
            event
          );

          if (!mounted) return;

          setSession(
            newSession
          );

          if (!newSession) {
            setUser(null);
            setLoading(false);
            return;
          }

          /*
          Run profile loading AFTER
          the auth callback finishes.
          */

          setTimeout(() => {
            if (!mounted) return;

            fetchProfile(
              newSession.user.id
            ).finally(() => {
              if (mounted) {
                setLoading(false);
              }
            });
          }, 0);
        }
      );

    return () => {
      mounted = false;

      authListener.subscription.unsubscribe();
    };
  }, [fetchProfile]);

  /*
  =========================================================
  LOGOUT
  =========================================================
  */

  const logout = async () => {
    console.log(
      "Signing out..."
    );

    const {
      error,
    } =
      await supabase.auth.signOut();

    if (error) {
      console.error(
        "LOGOUT ERROR:",
        error
      );

      return;
    }

    setUser(null);
    setSession(null);
  };

  /*
  =========================================================
  UPDATE LANGUAGE
  =========================================================
  */

  const updateUserLanguage =
    async (
      lang: string
    ) => {
      if (!session?.user) {
        return;
      }

      const {
        data,
        error,
      } =
        await supabase
          .from("profiles")
          .update({
            language: lang,
          })
          .eq(
            "id",
            session.user.id
          )
          .select(
            "id, name, role, grade, language, created_at"
          )
          .single();

      if (error) {
        console.error(
          "LANGUAGE UPDATE ERROR:",
          error
        );

        return;
      }

      setUser(
        data as Profile
      );
    };

  /*
  =========================================================
  UPDATE GRADE
  =========================================================
  */

  const updateUserGrade =
    async (
      grade: string
    ) => {
      if (!session?.user) {
        return;
      }

      const {
        data,
        error,
      } =
        await supabase
          .from("profiles")
          .update({
            grade,
          })
          .eq(
            "id",
            session.user.id
          )
          .select(
            "id, name, role, grade, language, created_at"
          )
          .single();

      if (error) {
        console.error(
          "GRADE UPDATE ERROR:",
          error
        );

        return;
      }

      setUser(
        data as Profile
      );
    };

  /*
  =========================================================
  REFRESH PROFILE
  =========================================================
  */

  const refreshProfile =
    async () => {
      if (!session?.user) {
        return;
      }

      await fetchProfile(
        session.user.id
      );
    };

  /*
  =========================================================
  PROVIDER
  =========================================================
  */

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        logout,
        updateUserLanguage,
        updateUserGrade,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/*
===========================================================
USE AUTH
===========================================================
*/

export function useAuth() {
  const context =
    useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider"
    );
  }

  return context;
}