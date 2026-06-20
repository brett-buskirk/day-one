import { useEffect, useRef, type KeyboardEvent } from "react";

// Shared modal a11y: focus the dialog on open, restore focus to the trigger on
// close, trap Tab within it, and close on Escape. Used by the event sheet and
// confirmation dialogs.
export function useDialogFocus(onClose: () => void) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    return () => prev?.focus?.();
  }, []);

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== "Tab") return;
    const focusables = ref.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], textarea, input, [tabindex]:not([tabindex="-1"])'
    );
    if (!focusables || focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && (active === first || active === ref.current)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return { ref, onKeyDown };
}
