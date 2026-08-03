import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "../../utils/cn";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type Size = "sm" | "md";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const VARIANT_CLASSNAMES: Record<Variant, string> = {
  primary:
    "bg-primary text-white hover:bg-primary-hover active:bg-primary-hover disabled:bg-[#FFC79E] disabled:text-white/80",
  secondary:
    "bg-[#F5F5F4] text-ink hover:bg-[#ECECEB] active:bg-[#E4E4E3] disabled:bg-[#F5F5F4] disabled:text-ink-muted",
  outline:
    "border border-primary text-primary bg-transparent hover:bg-primary-soft active:bg-[#FFE4CC] disabled:border-border-strong disabled:text-ink-muted",
  ghost: "bg-transparent text-ink-secondary hover:bg-[#F5F5F4] active:bg-[#ECECEB] disabled:text-ink-muted",
  danger: "bg-red text-white hover:bg-[#D42E2E] active:bg-[#C22626] disabled:bg-[#F3B3B3]",
};

const SIZE_CLASSNAMES: Record<Size, string> = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  // A native <button> with no type defaults to "submit" inside a <form> —
  // every explicit submit button in this codebase already says so itself
  // (verified: no form relies on the implicit default), so flipping the
  // fallback to "button" only removes the risk of a Cancel/icon button
  // accidentally submitting a form it was never meant to.
  ({ variant = "primary", size = "md", className, type = "button", ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          "inline-flex select-none items-center justify-center whitespace-nowrap rounded-[10px] font-semibold transition-colors duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1",
          "disabled:cursor-not-allowed",
          VARIANT_CLASSNAMES[variant],
          SIZE_CLASSNAMES[size],
          className,
        )}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";
