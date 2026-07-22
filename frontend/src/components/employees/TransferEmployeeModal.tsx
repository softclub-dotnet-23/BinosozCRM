import { useEffect, useState } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { CustomSelect } from "../ui/CustomSelect";
import { BRIGADE_OPTIONS, DEPARTMENT_OPTIONS } from "../../data/mockStaff";
import type { StaffMember } from "../../types";

type UnitType = "brigade" | "department";

interface TransferEmployeeModalProps {
  open: boolean;
  employee: StaffMember | null;
  onClose: () => void;
  onTransfer: (result: { brigadeName: string | null; brigadeSpecialization: string | null; department: string | null }) => void;
}

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
          <CustomSelect
            className="mt-1.5"
            value={unitType}
            onValueChange={(v) => setUnitType(v as UnitType)}
            options={[
              { value: "brigade", label: "Бригада" },
              { value: "department", label: "Отдел" },
            ]}
          />
        </label>

        {unitType === "brigade" ? (
          <label className="block text-sm font-medium text-ink">
            Новая бригада
            <CustomSelect
              searchable
              className="mt-1.5"
              value={brigadeName}
              onValueChange={setBrigadeName}
              options={BRIGADE_OPTIONS.map((b) => ({ value: b.name, label: `${b.name} — ${b.specialization}` }))}
            />
          </label>
        ) : (
          <label className="block text-sm font-medium text-ink">
            Новый отдел
            <CustomSelect
              searchable
              className="mt-1.5"
              value={department}
              onValueChange={setDepartment}
              options={DEPARTMENT_OPTIONS.map((d) => ({ value: d, label: d }))}
            />
          </label>
        )}
      </div>
    </Modal>
  );
}
