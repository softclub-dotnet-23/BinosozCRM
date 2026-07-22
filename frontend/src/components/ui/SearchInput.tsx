import type { InputHTMLAttributes } from "react";
import { Search } from "lucide-react";
import { cn } from "../../utils/cn";

interface SearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  containerClassName?: string;
}

export function SearchInput({ containerClassName, className, ...props }: SearchInputProps) {
  return (
    <div className={cn("relative", containerClassName)}>
      <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" />
      <input
        type="text"
        className={cn(
          "h-10 w-full rounded-[10px] border border-border-strong bg-card pl-10 pr-3.5 text-sm text-ink placeholder:text-ink-muted",
          "transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15",
          className,
        )}
        {...props}
      />
    </div>
  );
}
