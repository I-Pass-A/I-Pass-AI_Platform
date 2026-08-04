import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

export const metadata: Metadata = {
  title: "I-Pass-A | AI-Powered Tutor & Exam Prep",
  description: "Advanced AI Tutor and Practice Exam Generator grounded in school curriculum (Grades 1-12, English & Afaan Oromo).",
  viewport: "width=device-width, initial-scale=1",
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
        </AuthProvider>
      </body>
    </html>
  );
}
