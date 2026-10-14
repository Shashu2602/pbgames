import { useEffect, useRef, type ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  onClose?: () => void;
  /** Esc closes the modal (calls onClose). */
  dismissible?: boolean;
  /** Full-viewport transparent dialog: children position themselves. */
  fullscreen?: boolean;
  labelledBy?: string;
  className?: string;
  children: ReactNode;
}

/**
 * Native <dialog> opened with showModal(): top-layer, inert background,
 * focus containment and Esc handling come from the platform.
 */
export function Modal({ open, onClose, dismissible = true, fullscreen, labelledBy, className, children }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      try {
        d.showModal();
      } catch {
        d.setAttribute('open', '');
      }
    } else if (!open && d.open) {
      d.close();
    }
  }, [open]);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    const onCancel = (e: Event) => {
      e.preventDefault();
      if (dismissible) onCloseRef.current?.();
    };
    d.addEventListener('cancel', onCancel);
    return () => d.removeEventListener('cancel', onCancel);
  }, [dismissible]);

  // Make sure a modal never outlives its component.
  useEffect(
    () => () => {
      if (ref.current?.open) ref.current.close();
    },
    [],
  );

  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      className={
        fullscreen
          ? `fixed inset-0 m-0 h-dvh w-screen bg-transparent outline-none ${className ?? ''}`
          : `m-auto bg-transparent outline-none backdrop:bg-[rgba(23,23,23,0.5)] ${className ?? ''}`
      }
    >
      {open ? children : null}
    </dialog>
  );
}
