import { Calendar, Phone, ShieldCheck } from "lucide-react";
import { Modal } from "../ui/Modal";
import { Avatar } from "../ui/Avatar";
import { useCurrentUser } from "../../hooks/api/useUsers";
import { useLanguage } from "../../context/LanguageContext";
import type { SessionUser } from "../../types";

interface ProfileModalProps {
  open: boolean;
  onClose: () => void;
  user: SessionUser;
}

export function ProfileModal({ open, onClose, user }: ProfileModalProps) {
  const { strings } = useLanguage();
  const c = strings.common;
  // GET /users/me — real account details (phone, registration date) beyond what the JWT/session
  // already carries. Only fetched while the modal is actually open.
  const { data: account } = useCurrentUser(open);

  return (
    <Modal open={open} onClose={onClose} title={c.profileTitle} size="sm">
      <div className="flex items-center gap-3">
        <Avatar name={user.fullName} size="md" />
        <div>
          <p className="text-sm font-semibold text-ink">{user.fullName}</p>
        </div>
      </div>
      <div className="mt-5 space-y-3 border-t border-border pt-4">
        <Row icon={ShieldCheck} label={c.profileRole} value={c.roleLabels[user.role]} />
        {account?.phone && <Row icon={Phone} label={c.profilePhone} value={account.phone} />}
        {account?.createdAt && <Row icon={Calendar} label={c.profileRegisteredAt} value={new Date(account.createdAt).toLocaleDateString("ru-RU")} />}
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
