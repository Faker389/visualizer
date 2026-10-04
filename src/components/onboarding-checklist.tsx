"use client";

import Link from "next/link";
import { Check, X } from "lucide-react";
import { Card } from "@/components/ui";
import { useActivity } from "@/components/activity-store";
import { useModels } from "@/components/models-store";
import { defaultSettings, useSettings } from "@/components/settings-store";
import { isLive } from "@/lib/models";
import { cn } from "@/lib/cn";

export function OnboardingChecklist({ onCreate }: { onCreate: () => void }) {
  const { models } = useModels();
  const { settings } = useSettings();
  const { onboarding, completeOnboarding } = useActivity();
  const firstLive = models.find(isLive);
  const modelHref = firstLive ? `/models/${firstLive.id}` : undefined;

  const steps: { label: string; done: boolean; href?: string; onClick?: () => void }[] = [
    { label: "Create your first 3D model", done: models.length > 0, onClick: onCreate },
    { label: "Publish a model", done: !!firstLive, href: models[0] && `/models/${models[0].id}` },
    { label: "Download a QR code", done: onboarding.qrDownloaded, href: modelHref },
    { label: "Add a model to your website", done: onboarding.embedCopied, href: modelHref },
    {
      label: "Set your brand color and domain",
      done: settings.brandColor !== defaultSettings.brandColor || settings.viewerDomain !== defaultSettings.viewerDomain,
      href: "/settings#workspace",
    },
    { label: "Invite a teammate", done: settings.team.length > 1, href: "/settings#team" },
  ];
  const done = steps.filter((s) => s.done).length;

  if (onboarding.dismissed || done === steps.length) return null;

  return (
    <Card className="mb-6 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-slate-900">Get set up</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            {done} of {steps.length} done. Finish these to get your first AR experience in front of customers.
          </p>
        </div>
        <button
          onClick={() => completeOnboarding("dismissed")}
          aria-label="Dismiss checklist"
          className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        >
          <X className="size-4" />
        </button>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all" style={{ width: `${(done / steps.length) * 100}%` }} />
      </div>
      <ol className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {steps.map((s) => {
          const content = (
            <>
              <span
                className={cn(
                  "grid size-5 shrink-0 place-items-center rounded-full",
                  s.done ? "bg-emerald-500 text-white" : "border-2 border-slate-300",
                )}
              >
                {s.done && <Check className="size-3" strokeWidth={3} aria-hidden />}
              </span>
              <span className={cn("text-sm", s.done ? "text-slate-400 line-through" : "font-medium text-slate-700")}>{s.label}</span>
              <span className="sr-only">{s.done ? "(done)" : "(to do)"}</span>
            </>
          );
          const cls = "flex w-full items-center gap-2.5 rounded-xl border border-slate-200/70 px-3 py-2.5 text-left transition";
          return (
            <li key={s.label}>
              {s.done ? (
                <div className={cn(cls, "bg-slate-50/60")}>{content}</div>
              ) : s.href ? (
                <Link href={s.href} className={cn(cls, "hover:border-indigo-200 hover:bg-indigo-50/40")}>
                  {content}
                </Link>
              ) : (
                <button onClick={s.onClick} className={cn(cls, "hover:border-indigo-200 hover:bg-indigo-50/40")}>
                  {content}
                </button>
              )}
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
