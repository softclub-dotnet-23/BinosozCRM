import { useCallback, useState } from "react";
import { readJson, writeJson } from "../lib/storage/localStorageEngine";

export interface ProfileSettings {
  pushNotifications: boolean;
  smsNotifications: boolean;
  telegramNotifications: boolean;
  profileVisible: boolean;
}

const STORAGE_KEY = "worker.profileSettings.v1";
const DEFAULT_SETTINGS: ProfileSettings = {
  pushNotifications: true,
  smsNotifications: true,
  telegramNotifications: true,
  profileVisible: true,
};

/** Local device preference, same pattern as AppLayout's sidebar-collapsed setting — there is no
 * real notification-delivery backend anywhere in this app, so these toggles genuinely control
 * only this browser's stored preference, not a fabricated server round-trip. */
export function useProfileSettings() {
  const [settings, setSettings] = useState<ProfileSettings>(() => ({ ...DEFAULT_SETTINGS, ...readJson<ProfileSettings>(STORAGE_KEY) }));

  const update = useCallback((patch: Partial<ProfileSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      writeJson(STORAGE_KEY, next);
      return next;
    });
  }, []);

  return { settings, update };
}
