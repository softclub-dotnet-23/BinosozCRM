import { Phone, ShieldCheck } from "lucide-react";
import { Modal } from "../ui/Modal";
import { Avatar } from "../ui/Avatar";
import { ROLE_LABEL } from "../../lib/auth/roleAccess";
import type { SessionUser } from "../../types";

interface ProfileModalProps {
  open: boolean;
  onClose: () => void;
  user: SessionUser;
}

/**
 * `user` is the real authenticated session (AuthContext, backed by
 * /auth/login + /auth/me — see api/authApi.ts's CurrentUser). It carries
 * exactly what the backend confirms for an account: id, login (the phone
 * number used to sign in), fullName, role — no email or registration date
 * field exists on CurrentUserDto, so those rows are omitted rather than
 * invented. Previously this looked the user up by id in the mock
 * `usersRepository`, which never matched a real backend-issued id (2026-07-31
 * remediation).
 */
export function ProfileModal({ open, onClose, user }: ProfileModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Профиль" size="sm">
      <div className="flex items-center gap-3">
        <Avatar name={user.fullName} size="md" />
        <div>
          <p className="text-sm font-semibold text-ink">{user.fullName}</p>
          <p className="text-xs text-ink-muted">@{user.login}</p>
        </div>
      </div>
      <div className="mt-5 space-y-3 border-t border-border pt-4">
        <Row icon={ShieldCheck} label="Роль" value={ROLE_LABEL[user.role]} />
        <Row icon={Phone} label="Телефон" value={user.login} />
      </div>
    </Modal>
  );
}

function Row({ icon: Icon, label, value }: { icon: typeof ShieldCheck; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5 text-sm">
      <Icon size={15} className="text-ink-muted" />
      <span className="text-ink-secondary">{label}</span>
      <span className="ml-auto font-semibold text-ink">{value}</span>
    </div>
  );
}
