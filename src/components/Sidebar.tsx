"use client";

import React from "react";
import { useAuth } from "@/context/AuthContext";
import {
  MessageSquare,
  Award,
  Shield,
  LogOut,
  GraduationCap,
  Globe,
  LayoutDashboard,
  BookOpen,
  History,
  Eye,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Sidebar() {
  const { user, logout, updateUserLanguage, updateUserGrade } = useAuth();
  const pathname = usePathname();

  if (!user) return null;

  // Handler for when grade changes
  const handleGradeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedGrade = e.target.value;
    updateUserGrade(selectedGrade);
    
    // Automatically determine language based on grade
    const gradeNum = parseInt(selectedGrade);
    if (!isNaN(gradeNum)) {
      if (gradeNum >= 1 && gradeNum <= 8) {
        updateUserLanguage("Afaan Oromo");
      } else {
        updateUserLanguage("English");
      }
    }
  };

  const isAO = user.language === "Afaan Oromo";

  const navItems = [
    {
      name: isAO ? "Fuula Jalqabaa" : "Dashboard",
      path: "/dashboard",
      icon: LayoutDashboard,
      roles: ["student", "teacher", "admin", "director"]
    },
    {
      name: isAO ? "Barsiisaa AI" : "AI Tutor",
      path: "/tutor",
      icon: MessageSquare,
      roles: ["student", "teacher", "admin"]
    },
    {
      name: isAO ? "Qophii Qormaataa" : "Exam Centre",
      path: "/exams",
      icon: Award,
      roles: ["student", "teacher", "admin"]
    },
    {
      name: isAO ? "Bu'aa Qormaataa" : "My Results",
      path: "/results",
      icon: History,
      roles: ["student"]
    },
    {
      name: isAO ? "Kuusaa Barnootaa" : "Curriculum",
      path: "/admin",
      icon: BookOpen,
      roles: ["teacher"]
    },
    {
      name: isAO ? "Bulchiinsa" : "Admin Panel",
      path: "/admin",
      icon: Shield,
      roles: ["admin"]
    },
    {
      name: isAO ? "To'annoo Guutuu" : "Director View",
      path: "/director",
      icon: Eye,
      roles: ["director"]
    },
  ];

  return (
    <aside className="glass-panel" style={{
      width: "280px",
      minWidth: "280px",
      height: "100vh",
      borderRadius: "0",
      borderRight: "1px solid var(--glass-border)",
      borderTop: "none",
      borderBottom: "none",
      borderLeft: "none",
      display: "flex",
      flexDirection: "column",
      background: "var(--sidebar-bg)",
      zIndex: 100
    }}>
      {/* Brand Header */}
      <div style={{
        padding: "2rem 1.5rem",
        borderBottom: "1px solid var(--glass-border)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "0.75rem",
        textAlign: "center"
      }}>
        <img 
          src="/logo.png" 
          alt="I-Pass-A Logo" 
          style={{ width: "88px", height: "88px", borderRadius: "16px", objectFit: "cover" }} 
        />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <h2 style={{ fontSize: "1.45rem", fontWeight: 800, margin: 0 }} className="text-gradient-primary">
            I-Pass-A
          </h2>
          <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: "0.15rem" }}>
            AI Tutor & Exam Prep
          </span>
        </div>
      </div>

      {/* Grade & Language Control Panel */}
      <div style={{
        padding: "1.5rem",
        borderBottom: "1px solid var(--glass-border)",
        display: "flex",
        flexDirection: "column",
        gap: "1rem"
      }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <GraduationCap size={16} /> {user.language === "Afaan Oromo" ? "Kutaa" : "Grade"}
          </label>
          <select 
            className="form-select" 
            value={user.grade || "9"} 
            onChange={handleGradeChange}
            style={{ padding: "0.5rem 0.75rem", fontSize: "0.85rem", background: "rgba(0,0,0,0.4)" }}
          >
            {["6", "8", "12"].map((g) => (
              <option key={g} value={g}>{user.language === "Afaan Oromo" ? `Kutaa ${g}` : `Grade ${g}`}</option>
            ))}
          </select>
        </div>

        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          fontSize: "0.8rem",
          color: "var(--text-secondary)",
          background: "rgba(255, 255, 255, 0.02)",
          padding: "0.5rem 0.75rem",
          borderRadius: "var(--radius-sm)",
          border: "1px solid var(--glass-border)"
        }}>
          <Globe size={14} style={{ color: "var(--secondary)" }} />
          <span>{user.language === "Afaan Oromo" ? "Afaan" : "Language"}: <strong>{user.language}</strong></span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav style={{
        flex: 1,
        padding: "1.5rem 1rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem"
      }}>
        {navItems
          .filter(item => item.roles.includes(user.role))
          .map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.path);
                
            return (
              <Link 
                key={item.path + item.name} 
                href={item.path}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  padding: "0.85rem 1rem",
                  borderRadius: "var(--radius-sm)",
                  color: isActive ? "#fff" : "var(--text-secondary)",
                  background: isActive ? "var(--glass-active)" : "transparent",
                  borderLeft: isActive ? "3px solid var(--primary)" : "3px solid transparent",
                  textDecoration: "none",
                  fontWeight: isActive ? 600 : 500,
                  fontSize: "0.95rem",
                  transition: "all var(--transition-fast)"
                }}
                className={!isActive ? "glass-panel-hover" : ""}
              >
                <Icon size={18} style={{ color: isActive ? "var(--primary)" : "inherit" }} />
                {item.name}
              </Link>
            );
          })}
      </nav>

      {/* User Footer Profile */}
      <div style={{
        padding: "1.5rem",
        borderTop: "1px solid var(--glass-border)",
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div style={{
            width: "36px",
            height: "36px",
            borderRadius: "50%",
            background: "rgba(255, 255, 255, 0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.9rem",
            fontWeight: "bold",
            color: "var(--primary)"
          }}>
            {user.name.split(" ").map(n => n[0]).join("").toUpperCase()}
          </div>
          <div style={{ overflow: "hidden" }}>
            <h4 style={{ fontSize: "0.875rem", margin: 0, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
              {user.name}
            </h4>
            <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", textTransform: "capitalize" }}>
              {user.role === "student"
                ? (isAO ? "Barataa" : "Student")
                : user.role === "teacher"
                  ? (isAO ? "Barsiisaa" : "Teacher")
                  : user.role === "director"
                    ? (isAO ? "Hogganaa" : "Director")
                    : (isAO ? "Bulchaa" : "Administrator")}
            </span>
          </div>
        </div>
        <button
          onClick={logout}
          style={{
            width: "100%",
            padding: "0.6rem 1rem",
            fontSize: "0.85rem",
            fontFamily: "var(--font-outfit)",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
            background: "rgba(239, 68, 68, 0.08)",
            border: "1px solid rgba(239, 68, 68, 0.25)",
            borderRadius: "var(--radius-sm)",
            color: "var(--danger)",
            cursor: "pointer",
            transition: "all var(--transition-fast)",
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = "rgba(239,68,68,0.15)";
            e.currentTarget.style.borderColor = "rgba(239,68,68,0.45)";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = "rgba(239,68,68,0.08)";
            e.currentTarget.style.borderColor = "rgba(239,68,68,0.25)";
          }}
        >
          <LogOut size={15} />
          {user.language === "Afaan Oromo" ? "Ba'i" : "Log Out"}
        </button>
      </div>
    </aside>
  );
}
