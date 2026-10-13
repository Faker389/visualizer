
import { FirebaseError } from "firebase/app";

export type Fields = { name: string; email: string; password: string; confirmPassword: string };
export type FieldErrors = Partial<Record<keyof Fields, string>>;
export type View = "login" | "register" | "forgot";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;
const MAX_PASSWORD = 128;
const MAX_NAME = 80;

// ---------- Validation ----------

export function validateName(name: string): string | undefined {
  if (!name) return "Enter your name.";
  if (name.length < 2) return "Name must be at least 2 characters.";
  if (name.length > MAX_NAME) return `Name can be at most ${MAX_NAME} characters.`;
}

export function validateEmail(email: string): string | undefined {
  if (!email) return "Enter your email.";
  if (!EMAIL_PATTERN.test(email)) return "Enter a valid email, like you@company.com.";
}

export function validateLoginPassword(password: string): string | undefined {
  if (!password) return "Enter your password.";
}

export function validateNewPassword(password: string): string | undefined {
  if (password.length < MIN_PASSWORD) return `Use at least ${MIN_PASSWORD} characters.`;
  if (password.length > MAX_PASSWORD) return `Use at most ${MAX_PASSWORD} characters.`;
  if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) return "Use at least one letter and one number.";
}

export function validateConfirmPassword(password: string, confirmPassword: string): string | undefined {
  if (!confirmPassword) return "Repeat your password.";
  if (password !== confirmPassword) return "Passwords don't match.";
}

export function validate(view: View, fields: Fields): FieldErrors {
  const errors: FieldErrors = { email: validateEmail(fields.email) };

  if (view === "login") {
    errors.password = validateLoginPassword(fields.password);
  }

  if (view === "register") {
    errors.name = validateName(fields.name);
    errors.password = validateNewPassword(fields.password);
    errors.confirmPassword = validateConfirmPassword(fields.password, fields.confirmPassword);
  }

  return Object.fromEntries(Object.entries(errors).filter(([, message]) => message)) as FieldErrors;
}

export function readFields(form: HTMLFormElement): Fields {
  const data = new FormData(form);
  const text = (key: string) => String(data.get(key) ?? "");
  return {
    name: text("name").trim(),
    email: text("email").trim().toLowerCase(),
    password: text("password"),
    confirmPassword: text("confirmPassword"),
  };
}

// ---------- Firebase error messages ----------

const firebaseMessages: Record<string, string> = {
  "auth/invalid-credential": "Email or password is incorrect.",
  "auth/wrong-password": "Email or password is incorrect.",
  "auth/user-not-found": "Email or password is incorrect.",
  "auth/invalid-email": "Enter a valid email, like you@company.com.",
  "auth/email-already-in-use": "An account with this email already exists. Log in instead.",
  "auth/weak-password": `Use at least ${MIN_PASSWORD} characters.`,
  "auth/too-many-requests": "Too many attempts. Wait a moment and try again.",
  "auth/network-request-failed": "No connection. Check your internet and try again.",
  "auth/popup-blocked": "Your browser blocked the Google window. Allow pop-ups and try again.",
  "auth/account-exists-with-different-credential": "This email already uses a different sign-in method.",
  "auth/unauthorized-domain": "Add this domain under Firebase Authentication → Settings → Authorized domains.",
};

const silentErrors = new Set(["auth/popup-closed-by-user", "auth/cancelled-popup-request"]);

export function errorMessage(err: unknown): string | null {
  if (err instanceof FirebaseError) {
    if (silentErrors.has(err.code)) return null;
    return firebaseMessages[err.code] ?? "Something went wrong. Try again.";
  }
  if (err instanceof Error && err.message) return err.message;
  return "Something went wrong. Try again.";
}