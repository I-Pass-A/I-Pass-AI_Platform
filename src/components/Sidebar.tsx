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

  const handleGradeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedGrade = e.target.value;
    updateUserGrade(selectedGrade);
    const gradeNum = parseInt(selectedGrade);
    if (!isNaN(gradeNum)) {
      updateUserLanguage(gradeNum <= 8 ? "Afaan Oromo" : "English");
    }
  };

  const isAO = user.language === "Afaan Oromo";

  const navItems = [
    { name: isAO ? "Fuula Jalqabaa" : "Dashboard", path: "/dashboard", icon: LayoutDashboard, roles: ["student", "teacher", "admin", "director"] },
    { name: isAO ? "Barsiisaa AI" : "AI Tutor",   path: "/tutor",     icon: MessageSquare,  roles: ["student", "teacher", "admin"] },
    { name: isAO ? "Qophii Qormaataa" : "Exam Centre", path: "/exams", icon: Award,          roles: ["student", "teacher", "admin"] },
    { name: isAO ? "Bu'aa Qormaataa" : "My Results",   path: "/results", icon: History,       roles: ["student"] },
    { name: isAO ? "Kuusaa Barnootaa" : "Curriculum",  path: "/admin",  icon: BookOpen,       roles: ["teacher"] },
    { name: isAO ? "Bulchiinsa" : "Admin Panel",       path: "/admin",  icon: Shield,         roles: ["admin"] },
    { name: isAO ? "To'annoo Guutuu" : "Director View",path: "/director",icon: Eye,           roles: ["director"] },
  ];

  const initials = user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase();

  const roleLabel = user.role === "student"
    ? (isAO ? "Barataa" : "Student")
    : user.role === "teacher"
      ? (isAO ? "Barsiisaa" : "Teacher")
      : user.role === "director"
        ? (isAO ? "Hogganaa" : "Director")
        : (isAO ? "Bulchaa" : "Administrator");

  return (
    <>
      <aside style={{
        position: "fixed",
        left: 0,
        top: 0,
        width: "260px",
        height: "100vh",
        background: "var(--sidebar-bg)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderRight: "1px solid var(--glass-border)",
        display: "flex",
        flexDirection: "column",
        zIndex: 40,
        overflowY: "auto"
      }}>

        {/* ── Brand ── */}
        <div style={{
          padding: "1.75rem 1.5rem 1.25rem",
          borderBottom: "1px solid var(--glass-border)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "0.75rem",
          textAlign: "center"
        }}>
          <img
            src="/logo.png"
            alt="I-Pass-A"
            style={{ width: "72px", height: "72px", borderRadius: "16px", objectFit: "cover" }}
          />
          <div>
            <h2 style={{
              fontSize: "1.5rem",
              fontWeight: 800,
              background: "linear-gradient(135deg, #38bdf8 0%, #10b981 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent"
            }}>I-Pass-A</h2>
            <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              AI Tutor & Exam Prep
            </span>
          </div>
        </div>

        {/* ── Grade & Language ── */}
        <div style={{
          padding: "1.25rem 1.5rem",
          borderBottom: "1px solid var(--glass-border)",
          display: "flex",
          flexDirection: "column",
          gap: "0.875rem"
        }}>
          <div>
            <label style={{
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              fontSize: "0.8rem",
              fontWeight: 500,
              color: "var(--text-secondary)",
              marginBottom: "0.5rem"
            }}>
              <GraduationCap size={14} />
              {isAO ? "Kutaa" : "Grade"}
            </label>

            {/* Admin & Director: can switch grades freely */}
            {(user.role === "admin" || user.role === "director") ? (
              <select
                value={user.grade || "12"}
                onChange={handleGradeChange}
                className="form-select"
                style={{ width: "100%", fontSize: "0.875rem" }}
              >
                {["6", "8", "12"].map((g) => (
                  <option key={g} value={g}>
                    {isAO ? `Kutaa ${g}` : `Grade ${g}`}
                  </option>
                ))}
              </select>
            ) : (
              /* Students & Teachers: fixed grade, no dropdown */
              <div style={{
                padding: "0.6rem 0.875rem",
                borderRadius: "8px",
                border: "1px solid var(--glass-border)",
                background: "var(--glass-bg)",
                fontSize: "0.875rem",
                color: "var(--text-primary)",
                fontWeight: 600
              }}>
                {isAO
                  ? `Kutaa ${user.role === "teacher" ? (user.grade_taught || "12") : (user.grade || "12")}`
                  : `Grade ${user.role === "teacher" ? (user.grade_taught || "12") : (user.grade || "12")}`}
              </div>
            )}
          </div>

          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            fontSize: "0.75rem",
            color: "var(--text-secondary)",
            background: "var(--glass-bg)",
            padding: "0.6rem 0.875rem",
            borderRadius: "8px",
            border: "1px solid var(--glass-border)"
          }}>
            <Globe size={13} style={{ color: "var(--primary)", flexShrink: 0 }} />
            <span>{isAO ? "Afaan" : "Language"}: <strong style={{ color: "var(--text-primary)" }}>{user.language}</strong></span>
          </div>
        </div>

        {/* ── Navigation ── */}
        <nav style={{
          flex: 1,
          padding: "1.25rem 1rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.375rem"
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
                    padding: "0.75rem 1rem",
                    borderRadius: "10px",
                    fontSize: "0.9rem",
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                    background: isActive ? "rgba(14, 165, 233, 0.12)" : "transparent",
                    borderLeft: isActive ? "3px solid var(--primary)" : "3px solid transparent",
                    textDecoration: "none",
                    transition: "all 0.15s ease"
                  }}
                >
                  <Icon size={18} style={{ color: isActive ? "var(--primary)" : "var(--text-muted)", flexShrink: 0 }} />
                  {item.name}
                </Link>
              );
            })}
        </nav>

        {/* ── User Profile Footer ── */}
        <div style={{
          padding: "1.25rem 1.5rem",
          borderTop: "1px solid var(--glass-border)",
          display: "flex",
          flexDirection: "column",
          gap: "0.875rem"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div style={{
              width: "38px",
              height: "38px",
              borderRadius: "50%",
              background: "rgba(14, 165, 233, 0.15)",
              border: "1px solid rgba(14, 165, 233, 0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.8rem",
              fontWeight: 700,
              color: "var(--primary)",
              flexShrink: 0
            }}>
              {initials}
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{
                fontSize: "0.875rem",
                fontWeight: 600,
                color: "var(--text-primary)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap"
              }}>{user.name}</p>
              <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", textTransform: "capitalize" }}>
                {roleLabel}
              </p>
            </div>
          </div>

          <button
            onClick={logout}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              padding: "0.625rem 1rem",
              background: "rgba(239, 68, 68, 0.08)",
              border: "1px solid rgba(239, 68, 68, 0.25)",
              borderRadius: "8px",
              color: "var(--danger)",
              fontSize: "0.875rem",
              fontWeight: 500,
              cursor: "pointer",
              transition: "all 0.15s ease"
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(239, 68, 68, 0.15)";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(239, 68, 68, 0.45)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(239, 68, 68, 0.08)";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(239, 68, 68, 0.25)";
            }}
          >
            <LogOut size={15} />
            {isAO ? "Ba'i" : "Log Out"}
          </button>
        </div>
      </aside>

      {/* Spacer to push main content right */}
      <div style={{ width: "260px", flexShrink: 0 }} />
    </>
  );
}
