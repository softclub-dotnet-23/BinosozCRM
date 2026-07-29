import { useState } from "react";
import { Bell, BellOff, BellRing } from "lucide-react";
import { useLanguage } from "../../../context/LanguageContext";

type PermissionState = "default" | "granted" | "denied" | "unsupported";

function readPermission(): PermissionState {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return window.Notification.permission;
}

/** Real browser Notification permission flow — no fabricated "enabled" state. Once the browser
 * has denied permission it refuses to re-prompt (a platform rule, not something this app can
 * override), so the button reflects that instead of pretending another click could work. */
export function PushNotificationCard() {
  const { strings } = useLanguage();
  const s = strings.worker;
  const [permission, setPermission] = useState<PermissionState>(readPermission);

  async function handleEnable() {
    if (permission !== "default") return;
    const result = await window.Notification.requestPermission();
    setPermission(result);
  }

  return (
    <div className="rounded-[13px] border border-purple/15 bg-purple-soft p-4">
      <div className="flex items-start gap-2.5">
        <BellRing size={18} className="mt-0.5 shrink-0 text-purple" />
        <div className="min-w-0">
          <p className="text-sm font-bold text-ink">{s.notificationPushTitle}</p>
          <p className="mt-1 text-xs leading-relaxed text-ink-secondary">{s.notificationPushDescription}</p>
        </div>
      </div>

      {permission === "granted" ? (
        <p className="mt-3 flex items-center justify-center gap-1.5 rounded-[10px] border border-purple/30 bg-card py-2.5 text-sm font-semibold text-purple">
          <Bell size={14} />
          {s.notificationPushEnabled}
        </p>
      ) : permission === "denied" ? (
        <p className="mt-3 flex items-center justify-center gap-1.5 rounded-[10px] border border-border-strong bg-card py-2.5 text-sm font-medium text-ink-muted">
          <BellOff size={14} />
          {s.notificationPushDenied}
        </p>
      ) : permission === "unsupported" ? (
        <p className="mt-3 text-center text-xs text-ink-muted">{s.notificationPushUnsupported}</p>
      ) : (
        <button
          type="button"
          onClick={() => void handleEnable()}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-[10px] border border-purple bg-card py-2.5 text-sm font-semibold text-purple transition-colors hover:bg-purple-soft"
        >
          <Bell size={14} />
          {s.notificationPushEnableButton}
        </button>
      )}
    </div>
  );
}
