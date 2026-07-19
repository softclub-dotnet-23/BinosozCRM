import { useState } from "react";
import { Package } from "lucide-react";
import { cn } from "../../utils/cn";

interface MaterialThumbnailProps {
  src: string;
  alt: string;
  className?: string;
}

export function MaterialThumbnail({ src, alt, className }: MaterialThumbnailProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className={cn("flex items-center justify-center rounded-lg bg-[#F5F5F4] text-ink-muted", className)}>
        <Package size={18} />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setFailed(true)}
      className={cn("rounded-lg object-cover", className)}
    />
  );
}
