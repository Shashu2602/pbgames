import { sfx } from '../engine/audio';
import { Modal } from './Modal';

interface Props {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  accent?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ open, title, message, confirmLabel, cancelLabel = 'CANCEL', accent = '#171717', danger, onConfirm, onCancel }: Props) {
  return (
    <Modal open={open} onClose={onCancel} labelledBy="confirm-title">
      <div className="panel-ink w-[min(30rem,92vw)] p-7" style={{ ['--shadow' as string]: danger ? '#E0524A' : accent }}>
        <h2 id="confirm-title" className="font-pixel text-[1.05rem] leading-relaxed">
          {title}
        </h2>
        <p className="mt-3 text-[1.08rem] leading-snug text-ink-2">{message}</p>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            autoFocus
            onClick={() => {
              sfx.play('click');
              onCancel();
            }}
            className="btn-arcade px-5 py-3 font-pixel text-[0.7rem]"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => {
              sfx.play('click');
              onConfirm();
            }}
            className="btn-arcade px-5 py-3 font-pixel text-[0.7rem]"
            style={{ ['--btn-bg' as string]: danger ? '#E0524A' : accent, ['--btn-fg' as string]: danger ? '#fff' : '#171717' }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
