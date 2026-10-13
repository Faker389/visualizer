"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { confirmPasswordReset, verifyPasswordResetCode } from "firebase/auth";
import { ArrowLeft, LoaderCircle, Mail } from "lucide-react";
import { Button, Input } from "@/components/ui";
import { AuthCard } from "@/components/auth/auth-card";
import { PasswordInput } from "@/components/auth/password-input";
import { auth } from "@/lib/firebase";
import { forgotFunction } from "@/lib/authFunctions";
import { clearUserCookie } from "@/lib/cookies";
import { FieldErrors, validateConfirmPassword, validateEmail, validateNewPassword } from "@/lib/errorHandling";
import { useAlertStore } from "@/lib/useAlert";

export default function ChangePasswordPage() {
  return (
    <Suspense>
      <ChangePassword />
    </Suspense>
  );
}

function ChangePassword() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const oobCode = searchParams.get("oobCode");
  const showAlert = useAlertStore((state) => state.showAlert);

  const [email, setEmail] = useState("");
  const [isResetMode, setIsResetMode] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  useEffect(() => {
    clearUserCookie();
    void auth?.signOut();
  }, []);

  useEffect(() => {
    if (!oobCode) return;

    const verifyCode = async (code: string) => {
      try {
        const userEmail = await verifyPasswordResetCode(auth, code);
        setEmail(userEmail);
        setIsResetMode(true);
      } catch {
        showAlert("Nieprawidłowy lub użyty link resetowania", "error");
        setTimeout(() => {
          router.push("/forgot-password");
        }, 2000);
      }
    };

    void verifyCode(oobCode);
  }, [oobCode, router, showAlert]);

  const handleResetEmailSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const emailError = validateEmail(email.trim().toLowerCase());
    setFieldErrors({ email: emailError });
    if (emailError) return;

    setIsLoading(true);
    try {
      await forgotFunction(email.trim().toLowerCase());
      showAlert("Email Wysłany!", "success");
      setEmail("");
    } catch {
      showAlert("Błąd podczas wysyłania emaila", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault();
    if (!oobCode) return;

    const errors: FieldErrors = {
      password: validateNewPassword(newPassword.trim()),
      confirmPassword: validateConfirmPassword(newPassword.trim(), confirmNewPassword.trim()),
    };
    setFieldErrors(errors);
    if (errors.password || errors.confirmPassword) return;

    setIsLoading(true);
    try {
      await confirmPasswordReset(auth, oobCode, newPassword.trim());
      showAlert("Hasło zostało pomyślnie zresetowane!", "success");
      setTimeout(() => {
        router.push("/login");
      }, 1500);
    } catch {
      showAlert("Nieprawidłowy lub użyty link resetowania", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const footer = (
    <Link href="/login" className="inline-flex items-center gap-1.5 font-medium text-slate-600 hover:text-slate-900">
      <ArrowLeft className="size-4" aria-hidden /> Back to Login
    </Link>
  );

  if (oobCode && !isResetMode) {
    return (
      <AuthCard title="Checking your link" subtitle="One moment while we verify your reset link." footer={footer}>
        <div className="grid place-items-center py-6">
          <LoaderCircle className="size-6 animate-spin text-indigo-600" aria-label="Verifying link" />
        </div>
      </AuthCard>
    );
  }

  if (isResetMode) {
    return (
      <AuthCard
        title="Set a new password"
        subtitle={email ? `For ${email}` : "Choose a new password for your account."}
        footer={footer}
      >
        <form onSubmit={handleResetPassword} noValidate className="space-y-4">
          <PasswordInput
            id="newPassword"
            name="newPassword"
            label="New password"
            autoComplete="new-password"
            error={fieldErrors.password}
            value={newPassword}
            onChange={setNewPassword}
          />
          {!fieldErrors.password && <p className="-mt-2 text-xs text-slate-500">At least 8 characters, with a letter and a number.</p>}
          <PasswordInput
            id="confirmNewPassword"
            name="confirmNewPassword"
            label="Confirm new password"
            autoComplete="new-password"
            error={fieldErrors.confirmPassword}
            value={confirmNewPassword}
            onChange={setConfirmNewPassword}
          />

          <Button type="submit" size="lg" className="w-full" disabled={isLoading}>
            {isLoading && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
            Change Password
          </Button>
        </form>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Reset your password" subtitle="Enter your email and we'll send you a reset link." footer={footer}>
      <form onSubmit={handleResetEmailSubmit} noValidate className="space-y-4">
        <Input
          id="email"
          name="email"
          type="email"
          label="Email"
          icon={Mail}
          placeholder="you@company.com"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={fieldErrors.email}
        />

        <Button type="submit" size="lg" className="w-full" disabled={isLoading}>
          {isLoading && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
          Send Reset Link
        </Button>
      </form>
    </AuthCard>
  );
}
