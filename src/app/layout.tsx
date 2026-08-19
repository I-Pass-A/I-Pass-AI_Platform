import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import CookieNotice from "@/components/CookieNotice";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "I-Pass-A | AI-Powered Tutor & Exam Prep",
  description: "Advanced AI Tutor and Practice Exam Generator grounded in school curriculum (Grades 1-12, English & Afaan Oromo).",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
          <CookieNotice />
        </AuthProvider>
      </body>
    </html>
  );
}
