import type { ReactNode } from "react";
import { useDialogFocus } from "./useDialog";

interface Props {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

// A reusable, accessible info modal (centered) — content plus a close button.
export function InfoModal({ title, onClose, children }: Props) {
  const { ref, onKeyDown } = useDialogFocus(onClose);
  return (
    <div className="sheet-backdrop modal-center" role="presentation" onClick={onClose}>
      <section
        ref={ref}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="info-title"
        tabIndex={-1}
        onKeyDown={onKeyDown}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="info-title">{title}</h2>
        {children}
        <div className="modal-actions">
          <button type="button" className="primary" onClick={onClose}>
            Got it
          </button>
        </div>
      </section>
    </div>
  );
}
