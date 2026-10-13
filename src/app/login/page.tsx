"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { LoaderCircle, Mail } from "lucide-react";
import { Button, Input } from "@/components/ui";
import { AuthCard } from "@/components/auth/auth-card";
import { GoogleButton } from "@/components/auth/google-button";
import { PasswordInput } from "@/components/auth/password-input";
import { auth, firebaseConfigError } from "@/lib/firebase";
import { FieldErrors, readFields, validate } from "@/lib/errorHandling";
import { signInWithEmailAndPassword } from "firebase/auth";
import { getUserByCredential } from "@/lib/dbActions";
import { useAlertStore } from "@/lib/useAlert";
import { saveUserCookie } from "@/lib/cookies";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const configError = firebaseConfigError();
  const showAlert = useAlertStore((state) => state.showAlert);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fields = readFields(e.currentTarget);

    const errors = validate("login", fields);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setLoading(true);
    try {
        const credentials = await signInWithEmailAndPassword(
        auth,
        fields.email.replace(/\s+/g, "").trim(),
        fields.password.replace(/\s+/g, "").trim()
      );
      const user = await getUserByCredential("id",credentials.user.uid)
      if(!user){
        showAlert('Nie udało sie zalogować!',"error",)
        return;
      }
      const objectToPass ={
        id: user.id,
        name: user.name,
        veryfiedEmail:user.veryfiedEmail,
        email:user.email,
        authMethod:user.authMethod
      }
      await saveUserCookie(objectToPass)
      showAlert("Zalogowano!","success");
      setTimeout(() => {
        router.push("/");
      }, 1000)
    } catch (error) {
        console.log(error);
        
      const user = await getUserByCredential("email",fields.email.toLowerCase().trim())
      if(user?.authMethod=="google") showAlert("To konto jest powiązane z logowaniem poprzez google. Zaloguj się przez google","warning")
      else showAlert("Nie udało się zalogować!","error")
      return;
    }finally{
      setLoading(false);
    }
  }

  return (
    <AuthCard
      title="Welcome back"
      subtitle="Sign in to manage your 3D & AR models."
      activeTab="login"
      footer={
        <>
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-medium text-indigo-600 hover:text-indigo-500">
            Sign up
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <Input id="email" name="email" type="email" label="Email" icon={Mail} placeholder="you@company.com" autoComplete="email" error={fieldErrors.email} />

        <div className="space-y-2">
          <PasswordInput id="password" name="password" label="Password" autoComplete="current-password" error={fieldErrors.password} />
          <div className="flex justify-end">
            <Link href="/forgot-password" className="text-sm font-medium text-indigo-600 hover:text-indigo-500 focus-visible:outline-none focus-visible:underline">
              Forgot password?
            </Link>
          </div>
        </div>

        {configError && (
          <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {configError}
          </p>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={loading || !!configError}>
          {loading && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
          Sign In
        </Button>
      </form>

      <GoogleButton disabled={loading} />
    </AuthCard>
  );
}
