import { useEffect, useState } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { BRIGADE_OPTIONS, DEPARTMENT_OPTIONS } from "../../data/mockStaff";
import type { StaffMember } from "../../types";

type UnitType = "brigade" | "department";

interface TransferEmployeeModalProps {
  open: boolean;
  employee: StaffMember | null;
  onClose: () => void;
  onTransfer: (result: { brigadeName: string | null; brigadeSpecialization: string | null; department: string | null }) => void;
}

const inputClass =
  "mt-1.5 w-full rounded-[10px] border border-border-strong px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15";

export function TransferEmployeeModal({ open, employee, onClose, onTransfer }: TransferEmployeeModalProps) {
  const [unitType, setUnitType] = useState<UnitType>("brigade");
  const [brigadeName, setBrigadeName] = useState(BRIGADE_OPTIONS[0].name);
  const [department, setDepartment] = useState(DEPARTMENT_OPTIONS[0]);

  useEffect(() => {
    if (open && employee) {
      setUnitType(employee.brigadeName ? "brigade" : "department");
      setBrigadeName(employee.brigadeName ?? BRIGADE_OPTIONS[0].name);
      setDepartment(employee.department ?? DEPARTMENT_OPTIONS[0]);
    }
  }, [open, employee]);

  if (!employee) return null;

  const currentUnit = employee.brigadeName ?? employee.department ?? "—";

  function handleConfirm() {
    if (unitType === "brigade") {
      const brigade = BRIGADE_OPTIONS.find((b) => b.name === brigadeName);
      onTransfer({ brigadeName, brigadeSpecialization: brigade?.specialization ?? null, department: null });
    } else {
      onTransfer({ brigadeName: null, brigadeSpecialization: null, department });
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Перевести сотрудника"
      description={`${employee.fullName} — текущее подразделение: ${currentUnit}`}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Отмена
          </Button>
          <Button onClick={handleConfirm}>Перевести</Button>
        </>
      }
    >
      <div className="space-y-4">
        <label className="block text-sm font-medium text-ink">
          Тип подразделения
          <select value={unitType} onChange={(e) => setUnitType(e.target.value as UnitType)} className={inputClass}>
            <option value="brigade">Бригада</option>
            <option value="department">Отдел</option>
          </select>
        </label>

        {unitType === "brigade" ? (
          <label className="block text-sm font-medium text-ink">
            Новая бригада
            <select value={brigadeName} onChange={(e) => setBrigadeName(e.target.value)} className={inputClass}>
              {BRIGADE_OPTIONS.map((b) => (
                <option key={b.name} value={b.name}>
                  {b.name} — {b.specialization}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <label className="block text-sm font-medium text-ink">
            Новый отдел
            <select value={department} onChange={(e) => setDepartment(e.target.value)} className={inputClass}>
              {DEPARTMENT_OPTIONS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
    </Modal>
  );
}
