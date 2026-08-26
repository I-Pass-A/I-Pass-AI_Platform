"use client";

import React, { useState, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import Sidebar from "@/components/Sidebar";
import AuthGuard from "@/components/AuthGuard";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { isAfaanOromo } from "@/lib/subjects";
import { User, Mail, GraduationCap, Globe, School, Camera, Save, ArrowLeft } from "lucide-react";

export default function ProfilePage() {
  const { user, loading, session } = useAuth();
  const router = useRouter();

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!user) return null;

  const isAO = isAfaanOromo(user);
  const meta = (user as any);
  const sessionMeta = (session as any)?.user?.user_metadata || {};
  const email = session?.user?.email ?? sessionMeta.email ?? "—";
  const schoolName = meta.school_name ?? sessionMeta.school_name ?? "—";
  const userAge = meta.age ?? sessionMeta.age ?? null;
  const userGender = meta.gender ?? sessionMeta.gender ?? null;

  const activeGrade = user.role === "teacher"
    ? (user.grade_taught ?? user.grade)
    : user.grade;

  const roleLabel = user.role === "student" ? (isAO ? "Barataa" : "Student")
    : user.role === "teacher" ? (isAO ? "Barsiisaa" : "Teacher")
    : user.role === "director" ? (isAO ? "Hogganaa" : "Director")
    : (isAO ? "Bulchaa" : "Administrator");

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setError("Image must be under 2MB"); return; }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `avatars/${user.id}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });
      if (upErr) throw upErr;

      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      setAvatarUrl(data.publicUrl + "?t=" + Date.now());
      setSuccess(isAO ? "Suuraan ol-kaafame!" : "Photo uploaded!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (e: any) {
      setError(e.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const initials = user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

  const infoRows = [
    { icon: <User size={16} />,          label: isAO ? "Maqaa Guutuu"       : "Full Name",       value: user.name },
    { icon: <Mail size={16} />,          label: isAO ? "Email"               : "Email",           value: email },
    { icon: <School size={16} />,        label: isAO ? "Mana Barumsaa"       : "School",          value: schoolName },
    { icon: <GraduationCap size={16} />, label: isAO ? "Kutaa"               : "Grade",           value: activeGrade ? `Grade ${activeGrade}` : "—" },
    { icon: <Globe size={16} />,         label: isAO ? "Afaan Barumsa"       : "Language",        value: user.language },
    { icon: <User size={16} />,          label: isAO ? "Gita"                : "Role",            value: roleLabel },
    ...(userAge    ? [{ icon: <User size={16} />, label: isAO ? "Umrii" : "Age",    value: String(userAge) }] : []),
    ...(userGender ? [{ icon: <User size={16} />, label: isAO ? "Saala" : "Gender", value: userGender === "male" ? (isAO ? "Dhiira" : "Male") : (isAO ? "Dhalaa" : "Female") }] : []),
  ];

  return (
    <AuthGuard>
      <div className="app-container">
        <Sidebar />
        <main className="main-content" style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <button onClick={() => router.back()} className="btn btn-outline" style={{ padding: "0.4rem 0.75rem", display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.85rem" }}>
              <ArrowLeft size={14} /> {isAO ? "Duubatti" : "Back"}
            </button>
            <h1 style={{ fontSize: "1.75rem", fontWeight: 800 }}>
              {isAO ? "Profaayilii Koo" : "My Profile"}
            </h1>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem", alignItems: "start" }}>

            {/* Avatar card */}
            <div className="glass-panel" style={{ padding: "2rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "1.25rem", textAlign: "center" }}>
              {/* Avatar */}
              <div style={{ position: "relative" }}>
                <div style={{
                  width: "100px", height: "100px", borderRadius: "50%",
                  background: avatarUrl ? "transparent" : "rgba(14,165,233,0.15)",
                  border: "3px solid rgba(14,165,233,0.3)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  overflow: "hidden", fontSize: "2rem", fontWeight: 800, color: "var(--primary)"
                }}>
                  {avatarUrl
                    ? <img src={avatarUrl} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : initials}
                </div>
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  style={{
                    position: "absolute", bottom: 0, right: 0,
                    width: "32px", height: "32px", borderRadius: "50%",
                    background: "var(--primary)", border: "2px solid var(--sidebar-bg)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer", color: "#fff"
                  }}
                  title={isAO ? "Suuraa jijjiiri" : "Change photo"}
                >
                  <Camera size={14} />
                </button>
                <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatarUpload} style={{ display: "none" }} />
              </div>

              <div>
                <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.25rem" }}>{user.name}</h2>
                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", textTransform: "capitalize" }}>{roleLabel}</p>
                {meta.school_name && (
                  <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>{meta.school_name}</p>
                )}
              </div>

              {success && (
                <div style={{ padding: "0.6rem 1rem", borderRadius: "8px", background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", color: "var(--success)", fontSize: "0.82rem", width: "100%" }}>
                  {success}
                </div>
              )}
              {error && (
                <div style={{ padding: "0.6rem 1rem", borderRadius: "8px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "var(--danger)", fontSize: "0.82rem", width: "100%" }}>
                  {error}
                </div>
              )}

              {uploading && <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{isAO ? "Ol-kaasaa jira..." : "Uploading..."}</p>}
            </div>

            {/* Info card */}
            <div className="glass-panel" style={{ padding: "2rem" }}>
              <h3 style={{ fontWeight: 700, marginBottom: "1.25rem", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", fontSize: "0.78rem" }}>
                {isAO ? "Odeeffannoo Koo" : "Account Information"}
              </h3>
              <div style={{ display: "flex", flexDirection: "column" }}>
                {infoRows.map((row, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: "0.875rem",
                    padding: "0.875rem 0",
                    borderBottom: i < infoRows.length - 1 ? "1px solid var(--glass-border)" : "none"
                  }}>
                    <div style={{ color: "var(--primary)", flexShrink: 0 }}>{row.icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: "0.15rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>{row.label}</p>
                      <p style={{ fontSize: "0.9rem", fontWeight: 500, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.value}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: "1.5rem", padding: "0.875rem 1rem", borderRadius: "8px", background: "rgba(14,165,233,0.06)", border: "1px solid rgba(14,165,233,0.15)", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                {isAO
                  ? "Odeeffannoo kee jijjiiruuf bulchaa mana barumsaa keessan quunnamaa."
                  : "To update your information, contact your school administrator."}
              </div>
            </div>
          </div>

        </main>
      </div>
    </AuthGuard>
  );
}
