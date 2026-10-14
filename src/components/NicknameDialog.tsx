import { useEffect, useState } from 'react';
import { randomNickname, sanitizeNickname } from '../app/store';
import { sfx } from '../engine/audio';
import { Modal } from './Modal';

interface Props {
  open: boolean;
  mode: 'first' | 'edit' | 'new';
  initial: string;
  onSubmit: (name: string) => void;
  onCancel: () => void;
}

/** Nickname only — no email, phone number or other personal data. */
export function NicknameDialog({ open, mode, initial, onSubmit, onCancel }: Props) {
  const [value, setValue] = useState(initial);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setValue(initial);
      setError('');
    }
  }, [open, initial]);

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const clean = sanitizeNickname(value);
    if (value.trim() && !clean) {
      setError('Use letters and numbers only.');
      sfx.play('error');
      return;
    }
    sfx.play('select');
    onSubmit(clean || randomNickname());
  };

  const title = mode === 'new' ? 'NEW PLAYER' : mode === 'edit' ? 'CHANGE NICKNAME' : 'WHO IS PLAYING?';

  return (
    <Modal open={open} onClose={onCancel} labelledBy="nick-title">
      <form onSubmit={submit} className="panel-ink w-[min(32rem,92vw)] p-7" style={{ ['--shadow' as string]: '#F4C542' }}>
        <h2 id="nick-title" className="font-pixel text-[1.1rem]">
          {title}
        </h2>
        <p className="mt-3 text-[1.05rem] text-ink-2">
          {mode === 'new'
            ? 'Starts a fresh score session. The previous player stays on this device’s leaderboard.'
            : 'Enter a short nickname for the scoreboard. That’s all — no email, phone or personal details.'}
        </p>
        <label htmlFor="nick" className="mt-5 block font-pixel text-[0.6rem] text-ink-2">
          NICKNAME (MAX 12)
        </label>
        <input
          id="nick"
          autoFocus
          autoComplete="off"
          spellCheck={false}
          maxLength={12}
          value={value}
          onChange={(e) => {
            setValue(e.target.value.toUpperCase());
            setError('');
          }}
          placeholder="E.G. ARYAN"
          className="mt-2 w-full rounded-xl border-[3px] border-ink bg-paper px-4 py-3 font-pixel text-[1.1rem] uppercase tracking-wider outline-none placeholder:text-ink-3 focus:shadow-[0_0_0_4px_#F4C54288]"
        />
        <div className="mt-2 min-h-[1.4em] text-[0.95rem] font-semibold text-bad" role="alert">
          {error}
        </div>
        <div className="mt-3 flex flex-wrap justify-end gap-3">
          <button type="button" onClick={onCancel} className="btn-arcade px-5 py-3 font-pixel text-[0.68rem]">
            CANCEL
          </button>
          {mode === 'first' && (
            <button type="button" onClick={() => onSubmit(randomNickname())} className="btn-arcade px-5 py-3 font-pixel text-[0.68rem]">
              SKIP
            </button>
          )}
          <button type="submit" className="btn-arcade px-6 py-3 font-pixel text-[0.68rem]" style={{ ['--btn-bg' as string]: '#F4C542' }}>
            {mode === 'first' ? "LET'S PLAY" : 'SAVE'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
