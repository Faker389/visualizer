"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type NotificationKind = "success" | "error" | "warning" | "info";

export type AppNotification = {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  href?: string;
  createdAt: number;
  read: boolean;
};

export type Onboarding = { qrDownloaded: boolean; embedCopied: boolean; dismissed: boolean };

type State = { notifications: AppNotification[]; onboarding: Onboarding };

const hour = 60 * 60 * 1000;
const seededAt = Date.now();

const defaultState: State = {
  notifications: [
    { id: "n3", kind: "error", title: "Toy Race Car couldn't be generated", body: "Not enough overlap between photos. Retrying is free.", href: "/models/toy-car", createdAt: seededAt - 1 * hour, read: false },
    { id: "n2", kind: "success", title: "Velvet Armchair is live", body: "Its QR code and link are ready to share.", href: "/models/armchair", createdAt: seededAt - 5 * hour, read: false },
    { id: "n1", kind: "info", title: "Scans are up 19.9% this month", body: "Running Sneaker is your top model.", href: "/analytics", createdAt: seededAt - 26 * hour, read: false },
  ],
  onboarding: { qrDownloaded: false, embedCopied: false, dismissed: false },
};

const STORAGE_KEY = "arcade3d.activity";

type Store = State & {
  unread: number;
  notify: (n: Pick<AppNotification, "kind" | "title" | "body" | "href">) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  completeOnboarding: (key: keyof Onboarding) => void;
};

const ActivityContext = createContext<Store | null>(null);

export function ActivityProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(defaultState);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setState({ ...defaultState, ...JSON.parse(stored) });
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const update = useCallback((fn: (s: State) => State) => {
    setState((prev) => {
      const next = fn(prev);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const notify = useCallback<Store["notify"]>(
    (n) =>
      update((s) => ({
        ...s,
        notifications: [{ ...n, id: crypto.randomUUID(), createdAt: Date.now(), read: false }, ...s.notifications].slice(0, 30),
      })),
    [update],
  );

  const markRead = useCallback(
    (id: string) => update((s) => ({ ...s, notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) })),
    [update],
  );

  const markAllRead = useCallback(() => update((s) => ({ ...s, notifications: s.notifications.map((n) => ({ ...n, read: true })) })), [update]);

  const completeOnboarding = useCallback(
    (key: keyof Onboarding) => update((s) => (s.onboarding[key] ? s : { ...s, onboarding: { ...s.onboarding, [key]: true } })),
    [update],
  );

  const value = useMemo(
    () => ({ ...state, unread: state.notifications.filter((n) => !n.read).length, notify, markRead, markAllRead, completeOnboarding }),
    [state, notify, markRead, markAllRead, completeOnboarding],
  );
  return <ActivityContext.Provider value={value}>{children}</ActivityContext.Provider>;
}

export function useActivity() {
  const ctx = useContext(ActivityContext);
  if (!ctx) throw new Error("useActivity must be used within ActivityProvider");
  return ctx;
}

/** For components that also render outside the dashboard (e.g. the public viewer). */
export const useOptionalActivity = () => useContext(ActivityContext);
