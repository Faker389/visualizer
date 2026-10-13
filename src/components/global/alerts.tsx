
"use client";

import { Alert, useAlertStore } from "@/lib/useAlert";
import { useEffect } from "react";

function AlertItem({ alert }: { alert: Alert }) {
  const removeAlert = useAlertStore((state) => state.removeAlert);

  useEffect(() => {
    const timer = setTimeout(() => {
      removeAlert(alert.id);
    }, 5000);

    return () => clearTimeout(timer);
  }, [alert.id, removeAlert]);

  const colors:{success:string,error:string,warning:string,info:string} = {
    success: "bg-green-600",
    error: "bg-red-600",
    warning: "bg-yellow-600",
    info: "bg-blue-600",
  };

  return (
    <div
      className={`${colors[alert.type]} rounded-lg p-4 text-white shadow-lg`}
    >
      <div className="flex items-center justify-between gap-4">
        <span>{alert.message}</span>

        <button
          onClick={() => removeAlert(alert.id)}
          aria-label="Dismiss alert"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

export default function GlobalAlerts() {
  const alerts = useAlertStore((state) => state.alerts);

  return (
    <div className="fixed right-5 top-5 z-50 flex w-80 flex-col gap-3">
      {alerts.map((alert) => (
        <AlertItem key={alert.id} alert={alert} />
      ))}
    </div>
  );
}
