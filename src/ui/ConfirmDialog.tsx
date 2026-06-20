import { useDialogFocus } from "./useDialog";

export interface DialogAction {
  label: string;
  onClick: () => void;
  variant?: "default" | "danger";
}

interface Props {
  title: string;
  message?: string;
  actions: DialogAction[];
  cancelLabel?: string;
  onCancel: () => void;
}

// A small, accessible confirmation dialog (centered). Reuses the shared modal
// focus behavior. The trailing cancel button is always the dismiss action.
export function ConfirmDialog({ title, message, actions, cancelLabel = "Cancel", onCancel }: Props) {
  const { ref, onKeyDown } = useDialogFocus(onCancel);
  return (
    <div className="sheet-backdrop modal-center" role="presentation" onClick={onCancel}>
      <section
        ref={ref}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        tabIndex={-1}
        onKeyDown={onKeyDown}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-title">{title}</h2>
        {message && <p className="muted">{message}</p>}
        <div className="modal-actions">
          {actions.map((a) => (
            <button
              key={a.label}
              type="button"
              className={`primary ${a.variant === "danger" ? "danger" : ""}`}
              onClick={a.onClick}
            >
              {a.label}
            </button>
          ))}
          <button type="button" className="link-btn" onClick={onCancel}>
            {cancelLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
