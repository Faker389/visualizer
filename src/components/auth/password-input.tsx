"use client";

import { useState } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";
import { Input } from "@/components/ui";

type PasswordInputProps = {
  id: string;
  name: string;
  label: string;
  autoComplete: string;
  error?: string;
  value?: string;
  onChange?: (value: string) => void;
};

export function PasswordInput({ id, name, label, autoComplete, error, value, onChange }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  return (
    <Input
      id={id}
      name={name}
      label={label}
      type={visible ? "text" : "password"}
      icon={Lock}
      placeholder="••••••••"
      autoComplete={autoComplete}
      error={error}
      value={value}
      onChange={onChange ? (e) => onChange(e.target.value) : undefined}
      trailing={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      }
    />
  );
}
