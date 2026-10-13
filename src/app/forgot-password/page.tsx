"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, LoaderCircle, Mail, MailCheck } from "lucide-react";
import { Button, Input } from "@/components/ui";
import { AuthCard } from "@/components/auth/auth-card";
import { firebaseConfigError } from "@/lib/firebase";
import { FieldErrors, readFields, validate } from "@/lib/errorHandling";
import { forgotFunction } from "@/lib/authFunctions";
import { useAlertStore } from "@/lib/useAlert";

export default function ForgotPasswordPage() {
  const showAlert = useAlertStore((state) => state.showAlert);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [resetSentTo, setResetSentTo] = useState<string | null>(null);
  const configError = firebaseConfigError();

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fields = readFields(e.currentTarget);

    const errors = validate("forgot", fields);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setLoading(true);
    try {
      await forgotFunction(fields.email);
      setResetSentTo(fields.email);
    } catch {
      showAlert("Błąd podczas wysyłania emaila", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard
      title="Reset your password"
      subtitle="Enter your email and we'll send you a reset link."
      footer={
        <Link href="/login" className="inline-flex items-center gap-1.5 font-medium text-slate-600 hover:text-slate-900">
          <ArrowLeft className="size-4" aria-hidden /> Back to Login
        </Link>
      }
    >
      {resetSentTo ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center" role="status">
          <MailCheck className="mx-auto size-8 text-emerald-600" aria-hidden />
          <p className="mt-3 text-sm font-medium text-emerald-900">Check your inbox</p>
          <p className="mt-1 text-sm text-emerald-700">
            If an account exists for <span className="font-medium">{resetSentTo}</span>, we sent a reset link.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <Input id="email" name="email" type="email" label="Email" icon={Mail} placeholder="you@company.com" autoComplete="email" error={fieldErrors.email} />

          {configError && (
            <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {configError}
            </p>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={loading || !!configError}>
            {loading && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
            Send Reset Link
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
