"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

interface User {
  id: number;
  name: str;
  email: str;
  role: string; // student, teacher, admin
  grade: string | null;
  language: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  loading: boolean;
  updateUserLanguage: (lang: string) => void;
  updateUserGrade: (grade: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load auth data from localStorage on mount
    const savedToken = localStorage.getItem("ipassa_token");
    const savedUser = localStorage.getItem("ipassa_user");
    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem("ipassa_token");
        localStorage.removeItem("ipassa_user");
      }
    }
    setLoading(false);
  }, []);

  const login = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem("ipassa_token", newToken);
    localStorage.setItem("ipassa_user", JSON.stringify(newUser));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("ipassa_token");
    localStorage.removeItem("ipassa_user");
  };

  const updateUserLanguage = (lang: string) => {
    if (user) {
      const updated = { ...user, language: lang };
      setUser(updated);
      localStorage.setItem("ipassa_user", JSON.stringify(updated));
    }
  };

  const updateUserGrade = (grade: string) => {
    if (user) {
      const updated = { ...user, grade };
      setUser(updated);
      localStorage.setItem("ipassa_user", JSON.stringify(updated));
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading, updateUserLanguage, updateUserGrade }}>
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
