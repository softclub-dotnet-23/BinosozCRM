import { Mail, Phone, ShieldCheck, User as UserIcon } from "lucide-react";
import { Modal } from "../ui/Modal";
import { Avatar } from "../ui/Avatar";
import { useRepositorySnapshot } from "../../hooks/useRepositoryState";
import { usersRepository } from "../../data/repositories";
import { ROLE_LABEL } from "../../lib/auth/roleAccess";
import type { SessionUser } from "../../types";

interface ProfileModalProps {
  open: boolean;
  onClose: () => void;
  user: SessionUser;
}

export function ProfileModal({ open, onClose, user }: ProfileModalProps) {
  const accounts = useRepositorySnapshot(usersRepository);
  const account = accounts.find((a) => a.id === user.id);

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
        {account?.phone && <Row icon={Phone} label="Телефон" value={account.phone} />}
        {account?.email && <Row icon={Mail} label="Email" value={account.email} />}
        {account?.registeredAt && <Row icon={UserIcon} label="Дата регистрации" value={account.registeredAt} />}
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
