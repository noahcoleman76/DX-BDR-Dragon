import { useEffect, useId, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent, ReactNode } from 'react';
import { safeUrl } from '../data/model';

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return <div className="empty"><div className="empty-mark" aria-hidden="true">◇</div><h3>{title}</h3><div className="muted text-sm mt-2">{children}</div></div>;
}
export function Modal({ title, children, onClose, onSubmit, submitLabel = 'Save' }: { title: string; children: ReactNode; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; submitLabel?: string }) {
  const dialog = useRef<HTMLDialogElement>(null); const titleId = useId();
  useEffect(() => { const element = dialog.current; element?.showModal(); element?.querySelector<HTMLElement>('input, textarea, select')?.focus(); return () => element?.close(); }, []);
  return <dialog ref={dialog} className="modal" aria-labelledby={titleId} onCancel={event => { event.preventDefault(); onClose(); }}>
    <form onSubmit={onSubmit} className="space-y-4"><div className="flex items-center justify-between gap-4"><h2 id={titleId} className="text-lg font-semibold">{title}</h2><button type="button" className="icon" aria-label="Close dialog" onClick={onClose}>×</button></div>
      {children}<div className="flex justify-end gap-2 pt-2"><button type="button" className="btn" onClick={onClose}>Cancel</button><button className="btn primary" type="submit">{submitLabel}</button></div></form>
  </dialog>;
}
export function Confirm({ title, children, onClose, onConfirm }: { title: string; children: ReactNode; onClose: () => void; onConfirm: () => void }) {
  return <Modal title={title} onClose={onClose} onSubmit={event => { event.preventDefault(); onConfirm(); }} submitLabel="Delete"><p className="muted text-sm leading-relaxed">{children}</p></Modal>;
}
export function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="field"><span>{label}</span>{children}</label>; }
export function ExternalLink({ value, label }: { value: string; label: string }) {
  const href = safeUrl(value);
  return href ? <a className="text-sm link break-all" href={href} target="_blank" rel="noopener noreferrer">{label} <span aria-hidden="true">↗</span></a> : <span className="muted text-sm">{value ? 'Invalid link' : 'No link added'}</span>;
}
export function InlineField({ label, value, save, multiline = false, type = 'text', required = false }: { label: string; value: string; save: (value: string) => void; multiline?: boolean; type?: string; required?: boolean }) {
  const [draft, setDraft] = useState(value); const latest = useRef(value); const committed = useRef(value); const saveRef = useRef(save);
  useEffect(() => { saveRef.current = save; }, [save]);
  const commit = () => {
    if (latest.current === committed.current || required && !latest.current.trim() || type === 'url' && latest.current && !safeUrl(latest.current)) return;
    const next = required ? latest.current.trim() : latest.current;
    committed.current = next; saveRef.current(next);
  };
  const commitRef = useRef(commit); useEffect(() => { commitRef.current = commit; });
  useEffect(() => {
    const flush = () => commitRef.current();
    window.addEventListener('beforeunload', flush);
    return () => { window.removeEventListener('beforeunload', flush); flush(); };
  }, []);
  const invalid = required && !draft.trim() || type === 'url' && !!draft && !safeUrl(draft);
  const props = { value: draft, onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { latest.current = event.target.value; setDraft(event.target.value); }, onBlur: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { latest.current = event.currentTarget.value; setDraft(event.currentTarget.value); commit(); }, 'aria-invalid': !!invalid, required };
  return <Field label={label}><span className="relative block">{multiline ? <textarea {...props} rows={6} className="input resize-y" /> : <input {...props} type={type === 'url' ? 'text' : type} className="input pr-8" />}<span className="edit-cue" aria-hidden="true">✎</span></span>{invalid && <span className="text-xs text-red-500">{required && !draft.trim() ? 'A name is required.' : 'Use an http or https website address.'}</span>}</Field>;
}
