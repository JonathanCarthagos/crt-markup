"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [isReady, setIsReady] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const canSubmit = useMemo(() => {
    return (
      isReady &&
      !isSubmitting &&
      password.length >= 8 &&
      confirmPassword.length >= 8 &&
      password === confirmPassword
    );
  }, [isReady, isSubmitting, password, confirmPassword]);

  useEffect(() => {
    let mounted = true;

    const bootstrapRecoverySession = async () => {
      if (typeof window !== "undefined" && window.location.hash) {
        const hashParams = new URLSearchParams(window.location.hash.slice(1));
        const errorCode = hashParams.get("error_code");
        const error = hashParams.get("error");

        if (errorCode === "otp_expired" || (error === "access_denied" && !!errorCode)) {
          setErrorMessage("This reset link is invalid or has expired. Request a new one below.");
          setIsReady(false);
          return;
        }
      }

      const { data, error } = await supabase.auth.getSession();
      if (!mounted) return;

      if (error) {
        setErrorMessage("Could not validate your recovery link. Please request a new one.");
        setIsReady(false);
        return;
      }

      if (!data.session) {
        setErrorMessage("Invalid or expired recovery link. Please request a new password reset email.");
        setIsReady(false);
        return;
      }

      setIsReady(true);
    };

    bootstrapRecoverySession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === "PASSWORD_RECOVERY" || !!session) {
        setErrorMessage(null);
        setIsReady(true);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = window.setInterval(() => {
      setCooldownSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldownSeconds]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setInfoMessage(null);

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setErrorMessage("Password must have at least 8 characters.");
      return;
    }

    setIsSubmitting(true);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setErrorMessage(error.message);
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
    setIsSuccess(true);
  };

  const handleResendLink = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setInfoMessage(null);

    if (cooldownSeconds > 0) {
      setErrorMessage(`Please wait ${cooldownSeconds}s before requesting another email.`);
      return;
    }

    if (!recoveryEmail.trim()) {
      setErrorMessage("Enter your email to receive a new reset link.");
      return;
    }

    setIsResending(true);
    const { error } = await supabase.auth.resetPasswordForEmail(recoveryEmail.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      if (error.message.toLowerCase().includes("email rate limit exceeded")) {
        setErrorMessage("Too many reset emails sent in a short time. Please wait a few minutes and try again.");
        setCooldownSeconds(60);
      } else {
        setErrorMessage(error.message);
      }
      setIsResending(false);
      return;
    }

    setInfoMessage("A new password reset link was sent. Please check your inbox.");
    setCooldownSeconds(60);
    setIsResending(false);
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-xl">
        <h1 className="text-2xl font-normal text-gray-900 mb-2" style={{ fontWeight: 400 }}>
          Reset your password
        </h1>
        <p className="text-sm text-gray-600 mb-5">
          Choose a new password to continue using your account.
        </p>

        {errorMessage && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}
        {infoMessage && (
          <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
            {infoMessage}
          </div>
        )}

        {isSuccess ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
              Password updated successfully. You can now sign in with your new password.
            </div>
            <Link
              href="/"
              className="inline-flex w-full items-center justify-center rounded-lg px-4 py-2 text-white hover:opacity-80 transition-opacity"
              style={{ backgroundColor: "#FE4004" }}
            >
              Back to home
            </Link>
          </div>
        ) : isReady ? (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">New password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full rounded-lg border-2 border-gray-300 px-3 py-2 text-gray-900 focus:outline-none"
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "#FE4004";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "#d1d5db";
                }}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Confirm password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat your password"
                className="w-full rounded-lg border-2 border-gray-300 px-3 py-2 text-gray-900 focus:outline-none"
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "#FE4004";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "#d1d5db";
                }}
              />
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              className="inline-flex w-full items-center justify-center rounded-lg px-4 py-2 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-80 transition-opacity"
              style={{ backgroundColor: "#FE4004" }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update password"
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleResendLink} className="space-y-3">
            <p className="text-sm text-gray-600">
              Your recovery link may be invalid or expired. Request a new one below.
            </p>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                value={recoveryEmail}
                onChange={(e) => setRecoveryEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full rounded-lg border-2 border-gray-300 px-3 py-2 text-gray-900 focus:outline-none"
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "#FE4004";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "#d1d5db";
                }}
              />
            </div>
            <button
              type="submit"
              disabled={isResending || cooldownSeconds > 0}
              className="inline-flex w-full items-center justify-center rounded-lg px-4 py-2 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-80 transition-opacity"
              style={{ backgroundColor: "#FE4004" }}
            >
              {isResending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : cooldownSeconds > 0 ? (
                `Wait ${cooldownSeconds}s`
              ) : (
                "Send new reset link"
              )}
            </button>
            <Link
              href="/"
              className="inline-flex w-full items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
            >
              Back to home
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
