"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { LoaderCircle, Mail, User } from "lucide-react";
import { Button, Input } from "@/components/ui";
import { AuthCard } from "@/components/auth/auth-card";
import { GoogleButton } from "@/components/auth/google-button";
import { PasswordInput } from "@/components/auth/password-input";
import { auth, firebaseConfigError } from "@/lib/firebase";
import { FieldErrors, readFields, validate } from "@/lib/errorHandling";
import { checkLoginMethod } from "@/lib/authFunctions";
import { addNewUserToDb, getUserByCredential } from "@/lib/dbActions";
import { normalize } from "@/lib/types";
import { useAlertStore } from "@/lib/useAlert";

export default function RegisterPage() {
  const router = useRouter();
  const showAlert = useAlertStore((state) => state.showAlert);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const configError = firebaseConfigError();

  async function registerFunction(email: string, password: string) {
    const alreadyRegistered = await checkLoginMethod(email, "password");
    if (alreadyRegistered) {
      showAlert("Jesteś już zarejestrowany. Zaloguj się", "warning");
      setTimeout(() => {
        router.push("/login");
      }, 2000);
      return;
    }

    const existingUser = await getUserByCredential("email", email);
    if (existingUser?.authMethod === "google") {
      showAlert("To konto jest powiązane z logowaniem poprzez Google. Zaloguj się przez Google", "warning");
      setTimeout(() => {
        router.push("/login");
      }, 2000);
      return;
    }

    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, normalize(password));
      const uid = userCredential.user.uid;

      try {
        await addNewUserToDb({
          id: uid,
          email,
          name: "",
          authMethod: "password",
          veryfiedEmail: false,
        });
        showAlert("Pomyślnie zarejestrowano użytkownika", "success");
      } catch {
        showAlert("Błąd podczas zarejestrowania użytkownika. Spróbuj ponownie później", "error");
        return;
      }
    } catch {
      const user = await getUserByCredential("email", email.toLowerCase().trim());
      if (user?.authMethod == "google") {
        showAlert("To konto jest powiązane z logowaniem poprzez google. Zaloguj się przez google", "warning");
      } else {
        showAlert("Nie udało się zalogować!", "error");
      }
      return null;
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fields = readFields(e.currentTarget);

    const errors = validate("register", fields);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    await registerFunction(fields.email, fields.password);
  }

  return (
    <AuthCard
      title="Create your account"
      subtitle="Turn any product into an AR experience in minutes."
      activeTab="register"
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <Input id="name" name="name" label="Full name" icon={User} placeholder="Jane Cooper" autoComplete="name" error={fieldErrors.name} />
        <Input id="email" name="email" type="email" label="Email" icon={Mail} placeholder="you@company.com" autoComplete="email" error={fieldErrors.email} />

        <PasswordInput id="password" name="password" label="Password" autoComplete="new-password" error={fieldErrors.password} />
        {!fieldErrors.password && <p className="-mt-2 text-xs text-slate-500">At least 8 characters, with a letter and a number.</p>}
        <PasswordInput id="confirmPassword" name="confirmPassword" label="Confirm password" autoComplete="new-password" error={fieldErrors.confirmPassword} />

        {configError && (
          <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {configError}
          </p>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={loading || !!configError}>
          {loading && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
          Create Account
        </Button>
      </form>

      <GoogleButton disabled={loading} />
    </AuthCard>
  );
}
