import type { FormEvent, ReactNode } from 'react';
import { ExternalLink as LinkIcon, Inbox } from 'lucide-react';
import { safeUrl } from '../data/model';
import { Button } from './Button';
import { Modal as DragonModal } from './Modal';
import { ConfirmDialog } from './ConfirmDialog';
export { InlineField } from './InlineField';

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return <div className="empty"><Inbox className="empty-mark" size={28} strokeWidth={1.3} aria-hidden="true" /><h3>{title}</h3><div className="muted text-sm mt-2">{children}</div></div>;
}
export function Modal({ title, children, onClose, onSubmit, submitLabel = 'Save' }: { title: string; children: ReactNode; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; submitLabel?: string }) {
  return <DragonModal open title={title} onClose={onClose}><form onSubmit={onSubmit} className="space-y-4">{children}<div className="flex justify-end gap-2 pt-2"><Button type="button" onClick={onClose}>Cancel</Button><Button variant="primary" type="submit">{submitLabel}</Button></div></form></DragonModal>;
}
export function Confirm({ title, children, onClose, onConfirm }: { title: string; children: ReactNode; onClose: () => void; onConfirm: () => void }) {
  return <ConfirmDialog open title={title} description={children} onCancel={onClose} onConfirm={onConfirm} />;
}
export function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="field"><span>{label}</span>{children}</label>; }
export function ExternalLink({ value, label }: { value: string; label: string }) {
  const href = safeUrl(value);
  return href ? <a className="text-sm link break-all" href={href} target="_blank" rel="noopener noreferrer">{label} <LinkIcon className="inline" size={13} aria-hidden="true" /></a> : <span className="muted text-sm">{value ? 'Invalid link' : 'No link added'}</span>;
}
