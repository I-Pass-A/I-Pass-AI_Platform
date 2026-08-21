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
      <div className="p-4 md:p-6 lg:p-8 border-b border-white/20 flex flex-col items-center gap-3 text-center">
        <img 
          src="/logo.png" 
          alt="I-Pass-A Logo" 
          className="w-16 h-16 md:w-20 md:h-20 lg:w-22 lg:h-22 rounded-2xl object-cover" 
        />
        <div className="flex flex-col items-center">
          <h2 className="text-xl md:text-2xl font-bold text-gradient-primary">
            I-Pass-A
          </h2>
          <span className="text-xs text-gray-400 uppercase tracking-wider">
            AI Tutor & Exam Prep
          </span>
        </div>
      </div>

      {/* Grade & Language Control Panel */}
      <div className="p-4 md:p-6 border-b border-white/20 space-y-4">
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
            <GraduationCap size={16} /> {user.language === "Afaan Oromo" ? "Kutaa" : "Grade"}
          </label>
          <select 
            value={user.grade || "9"} 
            onChange={handleGradeChange}
            className="w-full px-3 py-2 bg-black/40 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {["6", "8", "12"].map((g) => (
              <option key={g} value={g}>{user.language === "Afaan Oromo" ? `Kutaa ${g}` : `Grade ${g}`}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-400 bg-white/5 p-3 rounded-lg border border-white/10">
          <Globe size={14} className="text-blue-400" />
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
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-sm md:text-base ${
                  isActive 
                    ? 'bg-blue-600/20 text-white border-l-4 border-blue-500' 
                    : 'text-gray-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon size={18} className={isActive ? "text-blue-400" : ""} />
                {item.name}
              </Link>
            );
          })}
      </nav>

      {/* User Footer Profile */}
      <div className="p-4 md:p-6 border-t border-white/20 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-sm font-bold text-blue-400">
            {user.name.split(" ").map(n => n[0]).join("").toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-white truncate">
              {user.name}
            </h4>
            <span className="text-xs text-gray-400 capitalize">
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
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 hover:border-red-500/50 rounded-lg text-red-400 text-sm font-medium transition-colors"
        >
          <LogOut size={15} />
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
      <aside className="hidden md:flex fixed left-0 top-0 w-64 lg:w-72 h-full bg-black/40 backdrop-blur-md border-r border-white/20 z-40">
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
      <div className="hidden md:block w-64 lg:w-72 flex-shrink-0" />
    </>
  );
}
