import { useEffect, useState } from "react";
import { Modal } from "../../ui/Modal";
import { Button } from "../../ui/Button";
import { useLanguage } from "../../../context/LanguageContext";
import { useToast } from "../../../hooks/useToast";
import { employeesRepository, usersRepository } from "../../../data/repositories";
import type { Employee, UserAccount } from "../../../types";

// Matches this app's real Tajik phone formats (both the "+992 90X XX XX XX" scheme mockEmployees.ts
// generates and the "+992 XX XXX XX XX" scheme used elsewhere) rather than one rigid pattern that
// would reject the real seeded numbers it's supposed to validate.
const TJ_PHONE_RE = /^\+992\s?\d{2,3}(\s?\d{2,3}){2,3}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface EditProfileModalProps {
  open: boolean;
  onClose: () => void;
  employee: Employee;
  account: UserAccount | undefined;
}

export function EditProfileModal({ open, onClose, employee, account }: EditProfileModalProps) {
  const { strings } = useLanguage();
  const s = strings.worker;
  const { showToast } = useToast();

  const [firstName, setFirstName] = useState(employee.firstName);
  const [lastName, setLastName] = useState(employee.lastName);
  const [phone, setPhone] = useState(employee.phone);
  const [email, setEmail] = useState(account?.email ?? "");
  const [address, setAddress] = useState(employee.address ?? "");
  const [emergencyContact, setEmergencyContact] = useState(employee.emergencyContact ?? "");
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFirstName(employee.firstName);
    setLastName(employee.lastName);
    setPhone(employee.phone);
    setEmail(account?.email ?? "");
    setAddress(employee.address ?? "");
    setEmergencyContact(employee.emergencyContact ?? "");
    setTouched(false);
  }, [open, employee, account]);

  const firstNameError = touched && !firstName.trim() ? s.profileErrorFirstNameRequired : null;
  const lastNameError = touched && !lastName.trim() ? s.profileErrorLastNameRequired : null;
  const phoneError = touched && !TJ_PHONE_RE.test(phone.trim()) ? s.profileErrorPhoneInvalid : null;
  const emailError = touched && email.trim() && !EMAIL_RE.test(email.trim()) ? s.profileErrorEmailInvalid : null;
  const isValid = firstName.trim() && lastName.trim() && TJ_PHONE_RE.test(phone.trim()) && (!email.trim() || EMAIL_RE.test(email.trim()));

  async function handleSave() {
    setTouched(true);
    if (!isValid || submitting) return;
    setSubmitting(true);
    try {
      await employeesRepository.update(employee.id, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        fullName: `${firstName.trim()} ${lastName.trim()}`,
        phone: phone.trim(),
        address: address.trim(),
        emergencyContact: emergencyContact.trim(),
      });
      if (account) await usersRepository.update(account.id, { email: email.trim(), fullName: `${firstName.trim()} ${lastName.trim()}` });
      showToast(s.profileToastUpdated, "success");
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={s.profileEditButton}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {strings.common.cancelLabel}
          </Button>
          <Button onClick={handleSave} disabled={submitting}>
            {s.profileSaveButton}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="profile-first-name" className="mb-1.5 block text-xs font-semibold text-ink-secondary">
              {s.profileFieldFirstName}
            </label>
            <input
              id="profile-first-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="h-10 w-full rounded-[10px] border border-border-strong bg-card px-3 text-sm text-ink"
            />
            {firstNameError && <p className="mt-1 text-xs text-red">{firstNameError}</p>}
          </div>
          <div>
            <label htmlFor="profile-last-name" className="mb-1.5 block text-xs font-semibold text-ink-secondary">
              {s.profileFieldLastName}
            </label>
            <input
              id="profile-last-name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="h-10 w-full rounded-[10px] border border-border-strong bg-card px-3 text-sm text-ink"
            />
            {lastNameError && <p className="mt-1 text-xs text-red">{lastNameError}</p>}
          </div>
        </div>

        <div>
          <label htmlFor="profile-phone" className="mb-1.5 block text-xs font-semibold text-ink-secondary">
            {s.profilePhone}
          </label>
          <input
            id="profile-phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+992 90 000 00 00"
            className="h-10 w-full rounded-[10px] border border-border-strong bg-card px-3 text-sm text-ink"
          />
          {phoneError && <p className="mt-1 text-xs text-red">{phoneError}</p>}
        </div>

        <div>
          <label htmlFor="profile-email" className="mb-1.5 block text-xs font-semibold text-ink-secondary">
            {s.profileFieldEmail}
          </label>
          <input
            id="profile-email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-10 w-full rounded-[10px] border border-border-strong bg-card px-3 text-sm text-ink"
          />
          {emailError && <p className="mt-1 text-xs text-red">{emailError}</p>}
        </div>

        <div>
          <label htmlFor="profile-address" className="mb-1.5 block text-xs font-semibold text-ink-secondary">
            {s.profileFieldAddress}
          </label>
          <input
            id="profile-address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="h-10 w-full rounded-[10px] border border-border-strong bg-card px-3 text-sm text-ink"
          />
        </div>

        <div>
          <label htmlFor="profile-emergency" className="mb-1.5 block text-xs font-semibold text-ink-secondary">
            {s.profileFieldEmergencyContact}
          </label>
          <input
            id="profile-emergency"
            value={emergencyContact}
            onChange={(e) => setEmergencyContact(e.target.value)}
            className="h-10 w-full rounded-[10px] border border-border-strong bg-card px-3 text-sm text-ink"
          />
        </div>
      </div>
    </Modal>
  );
}
