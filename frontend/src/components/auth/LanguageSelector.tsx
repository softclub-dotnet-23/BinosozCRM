import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Globe2 } from "lucide-react";
import { LOGIN_LANGUAGES, type LoginLanguage } from "./loginTranslations";
import { useOnClickOutside } from "../../hooks/useOnClickOutside";

interface LanguageSelectorProps {
  value: LoginLanguage;
  onChange: (value: LoginLanguage) => void;
  label: string;
}

/** Custom dropdown (no native <select>) matching the login page's own design language, distinct from the app-wide CustomSelect used elsewhere. */
export function LanguageSelector({ value, onChange, label }: LanguageSelectorProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useOnClickOutside(wrapRef, () => setOpen(false));

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <div className="language-wrap" ref={wrapRef}>
      <button
        type="button"
        className="language-button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
      >
        <Globe2 size={18} />
        <span>{LOGIN_LANGUAGES.find((l) => l.value === value)?.label}</span>
        <ChevronDown size={16} />
      </button>

      {open && (
        <div className="language-menu" role="listbox" aria-label={label}>
          {LOGIN_LANGUAGES.map((option) => (
            <button
              type="button"
              key={option.value}
              role="option"
              aria-selected={value === option.value}
              className="language-option"
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
            >
              <span>{option.label}</span>
              {value === option.value && <Check size={16} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
