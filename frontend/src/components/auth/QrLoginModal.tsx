import { QrCode } from "lucide-react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";

interface QrLoginModalProps {
  open: boolean;
  onClose: () => void;
}

/** QR login has no backend/mobile-app counterpart yet — this says so plainly instead of faking a scanner. */
export function QrLoginModal({ open, onClose }: QrLoginModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Вход через QR-код" size="sm">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-soft text-primary">
          <QrCode size={28} />
        </div>
        <p className="text-sm text-ink-secondary">
          Вход по QR-коду потребует мобильного приложения BINOSOZ и backend-интеграции для подтверждения сессии.
          Эта функция ещё не подключена в текущей демо-версии — используйте логин и пароль.
        </p>
        <Button variant="secondary" onClick={onClose} className="w-full">
          Понятно
        </Button>
      </div>
    </Modal>
  );
}
