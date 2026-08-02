import { useEffect, useRef, useState } from "react";

/**
 * True once the ref'd element has entered the viewport, and stays true forever after — entrance
 * animations should play once when content first appears, not replay on every scroll pass. The
 * observer disconnects itself the moment it fires, so nothing keeps watching after that.
 */
export function useInViewOnce<T extends HTMLElement>(options?: IntersectionObserverInit) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || inView) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px", ...options },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [inView, options]);

  return { ref, inView };
}
