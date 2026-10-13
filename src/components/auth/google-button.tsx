"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithPopup } from "firebase/auth";
import { Button } from "@/components/ui";
import { auth, firebaseConfigError, provider } from "@/lib/firebase";
import { addNewUserToDb, getUserByCredential, updateUserSignInMethod } from "@/lib/dbActions";
import { CookieUser, saveUserCookie } from "@/lib/cookies";
import { normalize, userInterface } from "@/lib/types";
import { useAlertStore } from "@/lib/useAlert";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.78.43 3.45 1.18 4.94l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A10.6 10.6 0 0 0 12 1 11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38z" />
    </svg>
  );
}

export function GoogleButton({ disabled }: { disabled?: boolean }) {
  const router = useRouter();
  const showAlert = useAlertStore((state) => state.showAlert);
  const [loading, setLoading] = useState(false);

  async function handleGoogle() {
    if (!auth || !provider) return;

    setLoading(true);

    try {
      const result = await signInWithPopup(auth, provider);
      const firebaseUser = result.user;

      if (!firebaseUser || !firebaseUser.email) {
        showAlert("Błąd podczas logowania użytkownika. Spróbuj ponownie później", "error");
        return;
      }
      const email = normalize(firebaseUser.email);
      const userId = normalize(firebaseUser.uid);

      const existingUser = await getUserByCredential("id", userId);

      if (existingUser) {
        await updateUserSignInMethod(userId, "google");

        const refreshedUser = await getUserByCredential("id", userId);
        if (refreshedUser) {
          saveUserCookie({ ...refreshedUser });
        }

        setTimeout(() => {
          router.push("/");
        }, 1000);
        return;
      }

      const newUserDB: userInterface = {
        id: userId,
        name: normalize(firebaseUser.displayName!),
        veryfiedEmail: true,
        email,
        authMethod: "google",
      };
      if (firebaseUser.photoURL) newUserDB.photoURL = firebaseUser.photoURL;
      const newUserCookie: CookieUser = {
        id: userId,
        name: normalize(firebaseUser.displayName!),
        veryfiedEmail: true,
        email,
        authMethod: "google",
      };

      try {
        await addNewUserToDb(newUserDB);
        saveUserCookie(newUserCookie);
        showAlert("Zapisano użytkownika", "success");
      } catch {
        showAlert("Błąd podczas zapisywania użytkownika", "error");
      }

      setTimeout(() => {
        router.push("/");
      }, 1000);
    } catch (error) {
      showAlert("Błąd podczas logowania przez Google", "error");
      throw error;
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="relative my-6 flex items-center" role="separator">
        <div className="h-px flex-1 bg-slate-200" />
        <span className="px-3 text-xs font-medium uppercase tracking-wider text-slate-400">or</span>
        <div className="h-px flex-1 bg-slate-200" />
      </div>
      <Button variant="secondary" className="w-full" onClick={handleGoogle} disabled={disabled || loading || !!firebaseConfigError()}>
        <GoogleIcon /> Continue with Google
      </Button>
    </>
  );
}
