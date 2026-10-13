
import { create } from "zustand";

export type AlertType = "success" | "error" | "warning" | "info";

export interface Alert {
  id: string;
  message: string;
  type: AlertType;
}

interface AlertStore {
  alerts: Alert[];

  showAlert: (message: string, type?: AlertType) => void;
  removeAlert: (id: string) => void;
  clearAlerts: () => void;
}

export const useAlertStore = create<AlertStore>((set) => ({
  alerts: [],

  showAlert: (message, type = "info") => {
    const id = crypto.randomUUID();

    set((state) => ({
      alerts: [...state.alerts, { id, message, type }],
    }));
  },

  removeAlert: (id) =>
    set((state) => ({
      alerts: state.alerts.filter((alert) => alert.id !== id),
    })),

  clearAlerts: () => set({ alerts: [] }),
}));
