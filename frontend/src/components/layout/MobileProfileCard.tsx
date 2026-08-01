import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { SessionAvatar } from "./SessionAvatar";
import { useAuth } from "../../context/AuthContext";
import { ROLE_LABEL } from "../../lib/auth/roleAccess";

/**
 * Mobile-only profile/logout card, shown at the bottom of the mobile sidebar drawer (see
 * Sidebar.tsx — the desktop sidebar keeps its own footer, hidden below the lg breakpoint; logout
 * lives here on mobile and in the Header's profile dropdown on desktop/tablet). Reuses
 * SessionAvatar so the photo/initials fallback logic stays in exactly one place.
 */
export function MobileProfileCard({ onBeforeLogout }: { onBeforeLogout?: () => void }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  function handleLogout() {
    onBeforeLogout?.();
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="rounded-2xl border border-border-strong bg-card p-4 text-center shadow-(--shadow-card)">
      <SessionAvatar user={user} className="mx-auto h-20 w-20" />
      <p className="mt-3 truncate text-base font-bold text-ink">{user.fullName}</p>
      <p className="mt-0.5 truncate text-sm text-ink-muted">{ROLE_LABEL[user.role]}</p>
      <button
        type="button"
        onClick={handleLogout}
        className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-border-strong py-2.5 text-sm font-medium text-ink-secondary transition-colors hover:bg-[#F7F7F6] hover:text-ink"
      >
        <LogOut size={16} /> Выйти
      </button>
    </div>
  );
}
