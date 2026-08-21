"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function ConfirmPage() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");
  const router = useRouter();

  useEffect(() => {
    const confirmEmail = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get("token");
        const type = urlParams.get("type");

        if (!token) {
          setStatus("error");
          setMessage("No confirmation token found.");
          return;
        }

        if (type === "email_change") {
          // Handle email change confirmation
          const { error } = await supabase.auth.verifyOtp({
            token,
            type: "email_change"
          });

          if (error) {
            setStatus("error");
            setMessage("Email change failed: " + error.message);
          } else {
            setStatus("success");
            setMessage("Email successfully updated!");
          }
        } else {
          // Handle signup confirmation
          const { error } = await supabase.auth.verifyOtp({
            token,
            type: "signup"
          });

          if (error) {
            setStatus("error");
            setMessage("Email confirmation failed: " + error.message);
          } else {
            setStatus("success");
            setMessage("Email successfully verified! You can now sign in.");
          }
        }
      } catch (error) {
        setStatus("error");
        setMessage("An unexpected error occurred.");
      }
    };

    confirmEmail();
  }, []);

  const handleContinue = () => {
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Glassmorphism Card */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-2xl p-8">
          
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              {status === "loading" && (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              )}
              {status === "success" && (
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
              {status === "error" && (
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </div>
            
            <h1 className="text-2xl font-bold text-white mb-2">
              {status === "loading" && "Confirming Email..."}
              {status === "success" && "Email Confirmed!"}
              {status === "error" && "Confirmation Failed"}
            </h1>
            
            <p className="text-gray-300 text-sm">
              {status === "loading" && "Please wait while we verify your email address."}
              {message}
            </p>
          </div>

          {/* Action Button */}
          {status !== "loading" && (
            <button
              onClick={handleContinue}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-4 rounded-xl font-semibold hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              Continue to I-Pass-A
            </button>
          )}

          {/* Additional Info */}
          {status === "error" && (
            <div className="mt-4 p-3 bg-red-500/20 border border-red-400/30 rounded-lg">
              <p className="text-red-200 text-sm">
                If you continue to have issues, please contact support or try signing up again.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}