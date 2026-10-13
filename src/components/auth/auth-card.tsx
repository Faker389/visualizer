import Link from "next/link";
import type { ReactNode } from "react";
import { Card } from "@/components/ui";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/cn";

const tabs = [
  { id: "login", label: "Log in", href: "/login" },
  { id: "register", label: "Sign up", href: "/register" },
] as const;

type AuthCardProps = {
  title: string;
  subtitle: string;
  activeTab?: "login" | "register";
  footer: ReactNode;
  children: ReactNode;
};

export function AuthCard({ title, subtitle, activeTab, footer, children }: AuthCardProps) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-slate-50 via-indigo-50/60 to-violet-100/60 px-4 py-12">
      <div aria-hidden className="pointer-events-none absolute -top-40 left-1/2 size-[36rem] -translate-x-1/2 rounded-full bg-indigo-300/20 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-40 -right-20 size-[28rem] rounded-full bg-violet-300/25 blur-3xl" />

      <Card className="relative w-full max-w-md p-8 shadow-xl shadow-indigo-900/5 sm:p-10">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo />
          <h1 className="mt-6 text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
          <p className="mt-1.5 text-sm text-slate-500">{subtitle}</p>
        </div>

        {activeTab && (
          <nav aria-label="Authentication" className="mb-6 grid grid-cols-2 rounded-xl bg-slate-100 p-1">
            {tabs.map((tab) => (
              <Link
                key={tab.id}
                href={tab.href}
                aria-current={activeTab === tab.id ? "page" : undefined}
                className={cn(
                  "grid h-9 place-items-center rounded-lg text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
                  activeTab === tab.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700",
                )}
              >
                {tab.label}
              </Link>
            ))}
          </nav>
        )}

        <div className="animate-fade-up">{children}</div>

        <div className="mt-8 text-center text-sm text-slate-500">{footer}</div>
      </Card>
    </main>
  );
}
