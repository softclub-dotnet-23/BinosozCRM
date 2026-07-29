import { Card } from "../../ui/Card";
import { Switch } from "../../ui/Switch";
import { CustomSelect } from "../../ui/CustomSelect";
import { useLanguage } from "../../../context/LanguageContext";
import { APP_LANGUAGES } from "../../../lib/i18n/appStrings";
import type { ProfileSettings } from "../../../hooks/useProfileSettings";

interface ProfileSettingsCardProps {
  settings: ProfileSettings;
  onUpdate: (patch: Partial<ProfileSettings>) => void;
}

export function ProfileSettingsCard({ settings, onUpdate }: ProfileSettingsCardProps) {
  const { strings, language, setLanguage } = useLanguage();
  const s = strings.worker;

  const rows: { key: keyof ProfileSettings; label: string }[] = [
    { key: "pushNotifications", label: s.profileSettingPush },
    { key: "smsNotifications", label: s.profileSettingSms },
    { key: "telegramNotifications", label: s.profileSettingTelegram },
    { key: "profileVisible", label: s.profileSettingVisibility },
  ];

  return (
    <Card className="p-4">
      <h2 className="text-sm font-bold text-ink">{s.profileSettingsTitle}</h2>
      <div className="mt-2 divide-y divide-border">
        {rows.map((row) => (
          <div key={row.key} className="flex items-center justify-between gap-3 py-2.5 text-sm">
            <span className="text-ink">{row.label}</span>
            <Switch checked={settings[row.key]} onChange={(checked) => onUpdate({ [row.key]: checked })} aria-label={row.label} />
          </div>
        ))}
      </div>
      <div className="mt-3 border-t border-border pt-3">
        <label htmlFor="profile-language" className="mb-1.5 block text-xs font-semibold text-ink-secondary">
          {s.profileSettingLanguage}
        </label>
        <CustomSelect id="profile-language" value={language} onValueChange={(v) => setLanguage(v as typeof language)} options={APP_LANGUAGES} />
      </div>
    </Card>
  );
}
