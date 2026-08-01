import { useEffect, useRef, type RefObject } from "react";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Reference-counted so two overlays open at once (e.g. a ConfirmDialog opened
// from within a Modal) don't have the first one to close unlock scrolling
// while the other is still open.
let openDialogCount = 0;

function lockBodyScroll(): void {
  openDialogCount += 1;
  if (openDialogCount === 1) document.body.style.overflow = "hidden";
}

function unlockBodyScroll(): void {
  openDialogCount = Math.max(0, openDialogCount - 1);
  if (openDialogCount === 0) document.body.style.overflow = "";
}

function getFocusable(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => el.offsetParent !== null,
  );
}

/**
 * Shared behavior for Modal/Drawer (and anything else that's a true
 * blocking dialog): locks body scroll, moves focus inside on open, traps
 * Tab/Shift+Tab within the container, closes on Escape, and restores focus
 * to whatever triggered it once this instance closes. Each call captures
 * its own "previously focused" element in a ref local to that instance, so
 * nested/stacked dialogs each restore to their own trigger independently —
 * not a shared stack that could point the wrong one at the wrong element.
 *
 * `onClose` is called as-is for Escape — if a caller needs to block closing
 * mid-submit, pass a conditional onClose (e.g. `submitting ? () => {} : onClose`),
 * same pattern already used for backdrop/close-button clicks.
 */
export function useDialogFocus(open: boolean, onClose: () => void, containerRef: RefObject<HTMLElement | null>): void {
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;
    lockBodyScroll();

    const container = containerRef.current;
    const focusable = container ? getFocusable(container) : [];
    (focusable[0] ?? container)?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onCloseRef.current();
        return;
      }

      if (event.key !== "Tab") return;
      const current = containerRef.current;
      if (!current) return;

      const elements = getFocusable(current);
      if (elements.length === 0) {
        event.preventDefault();
        return;
      }

      const first = elements[0];
      const last = elements[elements.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      unlockBodyScroll();
      // The trigger may have been removed from the DOM (e.g. a row it was in
      // got deleted while the dialog was open) — guard rather than throw.
      previouslyFocused.current?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, containerRef]);
}
