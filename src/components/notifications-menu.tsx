"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Bell, CheckCircle2, Info, XCircle, type LucideIcon } from "lucide-react";
import { useActivity, type NotificationKind } from "@/components/activity-store";
import { cn } from "@/lib/cn";

const kinds: Record<NotificationKind, { icon: LucideIcon; className: string }> = {
  success: { icon: CheckCircle2, className: "text-emerald-600 bg-emerald-50" },
  error: { icon: XCircle, className: "text-rose-600 bg-rose-50" },
  warning: { icon: AlertTriangle, className: "text-amber-600 bg-amber-50" },
  info: { icon: Info, className: "text-indigo-600 bg-indigo-50" },
};

function timeAgo(ts: number) {
  const min = Math.round((Date.now() - ts) / 60000);
  if (min < 1) return "Just now";
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return d === 1 ? "Yesterday" : `${d} days ago`;
}

export function NotificationsMenu() {
  const { notifications, unread, markRead, markAllRead } = useActivity();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={unread ? `Notifications (${unread} unread)` : "Notifications"}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="relative grid size-11 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      >
        <Bell className="size-[18px]" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold leading-5 text-white ring-2 ring-white">
            {unread}
          </span>
        )}
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="animate-fade-up absolute right-0 z-30 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10"
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-semibold text-slate-900">Notifications</p>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-xs font-medium text-indigo-600 hover:text-indigo-500">
                Mark all as read
              </button>
            )}
          </div>
          {notifications.length ? (
            <ul className="max-h-96 divide-y divide-slate-100 overflow-y-auto">
              {notifications.map((n) => {
                const { icon: Icon, className } = kinds[n.kind];
                const body = (
                  <>
                    <span className={cn("grid size-8 shrink-0 place-items-center rounded-full", className)}>
                      <Icon className="size-4" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={cn("block text-sm", n.read ? "text-slate-600" : "font-medium text-slate-900")}>{n.title}</span>
                      <span className="block text-xs text-slate-500">{n.body}</span>
                      <span className="mt-0.5 block text-xs text-slate-400">{timeAgo(n.createdAt)}</span>
                    </span>
                    {!n.read && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-indigo-500" aria-label="Unread" />}
                  </>
                );
                const cls = "flex gap-3 px-4 py-3 text-left transition hover:bg-slate-50";
                return (
                  <li key={n.id}>
                    {n.href ? (
                      <Link
                        href={n.href}
                        className={cls}
                        onClick={() => {
                          markRead(n.id);
                          setOpen(false);
                        }}
                      >
                        {body}
                      </Link>
                    ) : (
                      <button className={cn(cls, "w-full")} onClick={() => markRead(n.id)}>
                        {body}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="px-4 py-10 text-center text-sm text-slate-500">You’re all caught up.</p>
          )}
        </div>
      )}
    </div>
  );
}
