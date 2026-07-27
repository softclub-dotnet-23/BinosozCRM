import { useState } from "react";
import { cn } from "../../utils/cn";
import { Avatar } from "./Avatar";

export function OwnerAvatar({ className }: { className?: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return <Avatar name="Садди Имомов" className={cn("h-10 w-10 shrink-0", className)} />;
  }

  return (
    <img
      src="/images/avatar-owner.jpg"
      alt="Садди Имомов"
      onError={() => setFailed(true)}
      className={cn("h-10 w-10 shrink-0 rounded-full object-cover", className)}
    />
  );
}
