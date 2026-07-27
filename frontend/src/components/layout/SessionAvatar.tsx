import { Avatar } from "../ui/Avatar";
import { OwnerAvatar } from "../ui/OwnerAvatar";
import type { SessionUser } from "../../types";

interface SessionAvatarProps {
  user: SessionUser;
  className?: string;
}

/** The seeded owner account has a dedicated photo asset; every other role falls back to the generic name-based Avatar (photo if personPhotos.ts has one, initials otherwise). */
export function SessionAvatar({ user, className }: SessionAvatarProps) {
  if (user.role === "owner") return <OwnerAvatar className={className} />;
  return <Avatar name={user.fullName} className={className} />;
}
