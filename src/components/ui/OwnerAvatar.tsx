import { cn } from "../../utils/cn";

export function OwnerAvatar({ className }: { className?: string }) {
  return (
    <img
      src="/images/avatar-owner.jpg"
      alt="Садди Имомов"
      className={cn("h-10 w-10 shrink-0 rounded-full object-cover", className)}
    />
  );
}
