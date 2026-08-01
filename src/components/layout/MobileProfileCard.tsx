import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { SessionAvatar } from "./SessionAvatar";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";

interface MobileProfileCardProps {
  /** Runs before logout/navigation — lets the caller (e.g. the mobile drawer) close itself first. */
  onBeforeLogout?: () => void;
}

export function MobileProfileCard({ onBeforeLogout }: MobileProfileCardProps) {
  const { user, logout } = useAuth();
  const { strings } = useLanguage();
  const navigate = useNavigate();

  if (!user) return null;

  function handleLogout() {
    onBeforeLogout?.();
    logout();
    navigate("/login", { replace: true });
  }

  const displayName = user.fullName || user.login;

  return (
    <div className="rounded-2xl border border-border-strong bg-card p-4 text-center shadow-[var(--shadow-card)]">
      <SessionAvatar user={user} className="mx-auto h-20 w-20" />
      <p className="mt-3 truncate text-base font-bold text-ink">{displayName}</p>
      <p className="mt-0.5 truncate text-sm text-ink-muted">{strings.common.roleLabels[user.role]}</p>
      <button
        type="button"
        onClick={handleLogout}
        className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-border-strong py-2.5 text-sm font-medium text-ink-secondary transition-colors hover:bg-surface-2 hover:text-ink"
      >
        <LogOut size={16} /> {strings.sidebar.logout}
      </button>
    </div>
  );
}
