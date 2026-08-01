import { useEffect, useState } from "react";
import { resolveImageSource } from "../../lib/images/resolveImageSource";
import { cn } from "../../utils/cn";

interface AppImageProps {
  src?: string | null;
  alt: string;
  fallbackSrc?: string;
  className?: string;
  loading?: "lazy" | "eager";
  objectFit?: "cover" | "contain";
  /** Shows a neutral pulse in place of the image until it finishes loading. Off by default —
   * turn on for larger, above-the-fold images (object/login covers), not small table avatars. */
  showSkeleton?: boolean;
}

/**
 * Shared <img> wrapper: resolves the source through resolveImageSource, and — if it fails to
 * load — swaps to fallbackSrc exactly once (never a loop, since a second failure just renders
 * the neutral local fallback's own broken state is impossible: resolveImageSource always
 * returns a real local file for the fallback).
 */
export function AppImage({
  src,
  alt,
  fallbackSrc,
  className,
  loading = "lazy",
  objectFit = "cover",
  showSkeleton = false,
}: AppImageProps) {
  const resolved = resolveImageSource(src, fallbackSrc);
  const [currentSrc, setCurrentSrc] = useState(resolved);
  const [loaded, setLoaded] = useState(false);
  const [usedFallback, setUsedFallback] = useState(false);

  // A new `src` prop (e.g. a different row/material) means starting over, not carrying over
  // yesterday's failure state.
  useEffect(() => {
    setCurrentSrc(resolved);
    setLoaded(false);
    setUsedFallback(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolved]);

  function handleError() {
    if (import.meta.env.DEV) {
      console.warn("[AppImage] failed to load image:", currentSrc);
    }
    if (usedFallback) return;
    setUsedFallback(true);
    setCurrentSrc(resolveImageSource(null, fallbackSrc));
  }

  return (
    <span className={cn("relative block overflow-hidden", className)}>
      {showSkeleton && !loaded && <span className="absolute inset-0 animate-pulse bg-surface-3" aria-hidden="true" />}
      <img
        src={currentSrc}
        alt={alt}
        loading={loading}
        onError={handleError}
        onLoad={() => setLoaded(true)}
        className={cn("h-full w-full", objectFit === "cover" ? "object-cover" : "object-contain", showSkeleton && !loaded && "opacity-0")}
      />
    </span>
  );
}
