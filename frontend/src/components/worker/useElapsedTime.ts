import { useEffect, useState } from 'react';

/**
 * Presentation-only: ticks a display string off a real, backend-authoritative
 * start timestamp. Never writes back to any stored value — purely a local
 * re-render trigger every `intervalMs`, formatting `endIso ?? now`.
 */
export function useElapsedLabel(startIso: string | null, endIso: string | null, intervalMs = 30000): string | null {
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!startIso || endIso) return;
    const id = window.setInterval(() => setTick((t) => t + 1), intervalMs);
    return () => window.clearInterval(id);
  }, [startIso, endIso, intervalMs]);

  if (!startIso) return null;
  const start = new Date(startIso).getTime();
  const end = endIso ? new Date(endIso).getTime() : Date.now();
  const totalMinutes = Math.max(0, Math.round((end - start) / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours} ч ${minutes} мин` : `${minutes} мин`;
}
