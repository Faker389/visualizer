"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type TeamRole = "owner" | "admin" | "editor" | "viewer";
export type TeamMember = { id: string; email: string; name: string; role: TeamRole; status: "active" | "invited" };

export const roleInfo: Record<TeamRole, string> = {
  owner: "Full access, including billing and deleting the workspace",
  admin: "Everything except billing and ownership",
  editor: "Create, edit and publish models",
  viewer: "View models and analytics",
};

export type Settings = {
  team: TeamMember[];
  name: string;
  email: string;
  workspaceName: string;
  viewerDomain: string;
  brandColor: string;
  showBranding: boolean;
  qrColor: string;
  qrErrorCorrection: "L" | "M" | "Q" | "H";
  autoRotate: boolean;
  cameraControls: boolean;
  arPlacement: "floor" | "wall";
  arScale: "auto" | "fixed";
  shadowIntensity: number;
  viewerBackground: "light" | "dark" | "transparent";
  modelQuality: "high" | "medium" | "low";
  textureQuality: "4k" | "2k" | "1k";
  autoMask: boolean;
  dracoCompression: boolean;
  maxFileSizeMb: number;
  trackScans: boolean;
  collectCountry: boolean;
  retentionDays: 90 | 180 | 365 | 730;
  notifyModelReady: boolean;
  notifyModelFailed: boolean;
  notifyWeeklyReport: boolean;
  notifyStorage: boolean;
  apiKey: string;
  webhookUrl: string;
};

export const newApiKey = () =>
  `ar_live_${Array.from(crypto.getRandomValues(new Uint8Array(18)), (b) => b.toString(16).padStart(2, "0")).join("")}`;

export const defaultSettings: Settings = {
  team: [
    { id: "me", email: "jane@studio.co", name: "Jane Cooper", role: "owner", status: "active" },
    { id: "u2", email: "marek@studio.co", name: "Marek Nowak", role: "editor", status: "active" },
  ],
  name: "Jane Cooper",
  email: "jane@studio.co",
  workspaceName: "Studio Co",
  viewerDomain: "ar.yourdomain.com",
  brandColor: "#4f46e5",
  showBranding: true,
  qrColor: "#0f172a",
  qrErrorCorrection: "M",
  autoRotate: true,
  cameraControls: true,
  arPlacement: "floor",
  arScale: "auto",
  shadowIntensity: 1,
  viewerBackground: "light",
  modelQuality: "medium",
  textureQuality: "2k",
  autoMask: true,
  dracoCompression: true,
  maxFileSizeMb: 5,
  trackScans: true,
  collectCountry: true,
  retentionDays: 365,
  notifyModelReady: true,
  notifyModelFailed: true,
  notifyWeeklyReport: false,
  notifyStorage: true,
  apiKey: "ar_live_3f9c1e7a2b6d4058a1c9e2f7b3d6a8c0e4f1",
  webhookUrl: "",
};

const STORAGE_KEY = "arcade3d.settings";

type Store = { settings: Settings; saveSettings: (next: Settings) => void };

const SettingsContext = createContext<Store | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState(defaultSettings);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setSettings({ ...defaultSettings, ...JSON.parse(stored) });
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const saveSettings = useCallback((next: Settings) => {
    setSettings(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const value = useMemo(() => ({ settings, saveSettings }), [settings, saveSettings]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}
