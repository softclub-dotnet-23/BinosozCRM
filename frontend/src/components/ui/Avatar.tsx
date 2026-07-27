import { useState } from "react";
import { cn } from "../../utils/cn";
import { resolvePersonPhoto } from "../../utils/personPhotos";

type AvatarTone = "orange" | "blue" | "green" | "purple" | "red";

const TONE_CLASSNAMES: Record<AvatarTone, string> = {
  orange: "bg-primary-soft text-primary",
  blue: "bg-blue-soft text-blue",
  green: "bg-green-soft text-green",
  purple: "bg-purple-soft text-purple",
  red: "bg-red-soft text-red",
};

const TONES: AvatarTone[] = ["blue", "green", "orange", "purple", "red"];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function toneForName(name: string): AvatarTone {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return TONES[hash % TONES.length];
}

interface AvatarProps {
  name: string;
  size?: "sm" | "md";
  className?: string;
}

export function Avatar({ name, size = "md", className }: AvatarProps) {
  const [photoFailed, setPhotoFailed] = useState(false);
  const sizeClass = size === "md" ? "h-10 w-10 text-sm" : "h-8 w-8 text-xs";
  const photoSrc = resolvePersonPhoto(name);

  if (photoSrc && !photoFailed) {
    return (
      <img
        src={photoSrc}
        alt={name}
        onError={() => setPhotoFailed(true)}
        className={cn("shrink-0 rounded-full object-cover", sizeClass, className)}
      />
    );
  }

  const tone = toneForName(name);
  return (
    <div
      className={cn(
        "flex shrink-0 select-none items-center justify-center rounded-full font-bold",
        sizeClass,
        TONE_CLASSNAMES[tone],
        className,
      )}
      title={name}
      aria-hidden="true"
    >
      {getInitials(name)}
    </div>
  );
}
