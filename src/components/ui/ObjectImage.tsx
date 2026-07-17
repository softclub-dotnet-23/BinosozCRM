import { useState } from "react";
import { Building2 } from "lucide-react";
import type { ObjectType } from "../../types";
import { OBJECT_TYPE_IMAGE_FALLBACK } from "../../utils/objectImages";
import { cn } from "../../utils/cn";

interface ObjectImageProps {
  src: string;
  type: ObjectType;
  alt: string;
  className?: string;
}

export function ObjectImage({ src, type, alt, className }: ObjectImageProps) {
  const fallback = OBJECT_TYPE_IMAGE_FALLBACK[type];
  const [currentSrc, setCurrentSrc] = useState(src);
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className={cn("flex items-center justify-center bg-blue-soft text-blue", className)}>
        <Building2 size={20} />
      </div>
    );
  }

  return (
    <img
      src={currentSrc}
      alt={alt}
      className={cn("h-full w-full object-cover", className)}
      onError={() => {
        if (currentSrc !== fallback) {
          setCurrentSrc(fallback);
        } else {
          setFailed(true);
        }
      }}
    />
  );
}
