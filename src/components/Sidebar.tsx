"use client";

import React, { useState, useEffect } from "react";
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
  Menu,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Sidebar() {
  const { user, logout, updateUserLanguage, updateUserGrade } = useAuth();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close mobile menu when pathname changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (isMobileMenuOpen && !target.closest('[data-mobile-sidebar]') && !target.closest('[data-mobile-toggle]')) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobileMenuOpen]);

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

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Brand Header */}
      <div className="p-8 md:p-10 lg:p-12 border-b border-white/20 flex flex-col items-center gap-5 text-center bg-gradient-to-b from-white/5 to-transparent">
        <img 
          src="/logo.png" 
          alt="I-Pass-A Logo" 
          className="w-32 h-32 md:w-40 md:h-40 lg:w-48 lg:h-48 rounded-3xl object-cover shadow-2xl border-2 border-white/10" 
        />
        <div className="flex flex-col items-center">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-gradient-primary tracking-tight">
            I-Pass-A
          </h2>
          <span className="text-base md:text-lg text-gray-300 uppercase tracking-widest font-semibold">
            AI Tutor & Exam Prep
          </span>
        </div>
      </div>

      {/* Grade & Language Control Panel */}
      <div className="p-4 md:p-6 border-b border-white/20 space-y-4">
        <div>
          <label className="flex items-center gap-2 text-base font-semibold text-gray-300 mb-2">
            <GraduationCap size={18} /> {user.language === "Afaan Oromo" ? "Kutaa" : "Grade"}
          </label>
          <select 
            value={user.grade || "12"} 
            onChange={handleGradeChange}
            className="w-full px-4 py-3 bg-black/40 border border-white/20 rounded-lg text-white text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {["6", "8", "12"].map((g) => (
              <option key={g} value={g}>{user.language === "Afaan Oromo" ? `Kutaa ${g}` : `Grade ${g}`}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-400 bg-white/5 p-3 rounded-lg border border-white/10">
          <Globe size={16} className="text-blue-400" />
          <span>{user.language === "Afaan Oromo" ? "Afaan" : "Language"}: <strong className="text-white">{user.language}</strong></span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-4 md:p-6 space-y-2">
        {navItems
          .filter(item => item.roles.includes(user.role))
          .map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.path);
                
            return (
              <Link 
                key={item.path + item.name} 
                href={item.path}
                className={`flex items-center gap-4 px-5 py-4 rounded-lg transition-all text-base md:text-lg font-medium ${
                  isActive 
                    ? 'bg-blue-600/20 text-white border-l-4 border-blue-500' 
                    : 'text-gray-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon size={22} className={isActive ? "text-blue-400" : ""} />
                {item.name}
              </Link>
            );
          })}
      </nav>

      {/* User Footer Profile */}
      <div className="p-4 md:p-6 border-t border-white/20 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center text-sm font-bold text-blue-400">
            {user.name.split(" ").map(n => n[0]).join("").toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-base font-semibold text-white truncate">
              {user.name}
            </h4>
            <span className="text-sm text-gray-400 capitalize">
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
          className="w-full flex items-center justify-center gap-2 px-5 py-3.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 hover:border-red-500/50 rounded-lg text-red-400 text-base font-semibold transition-colors"
        >
          <LogOut size={18} />
          {user.language === "Afaan Oromo" ? "Ba'i" : "Log Out"}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Menu Toggle Button */}
      <button
        data-mobile-toggle
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white"
      >
        {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 w-80 lg:w-96 h-full bg-black/40 backdrop-blur-md border-r border-white/20 z-40">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar */}
      {isMobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div className="md:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40" />
          
          {/* Mobile Sidebar */}
          <aside 
            data-mobile-sidebar
            className="md:hidden fixed left-0 top-0 w-80 h-full bg-black/90 backdrop-blur-md border-r border-white/20 z-50 transform transition-transform"
          >
            <SidebarContent />
          </aside>
        </>
      )}

      {/* Spacer for desktop */}
      <div className="hidden md:block w-80 lg:w-96 flex-shrink-0" />
    </>
  );
}
