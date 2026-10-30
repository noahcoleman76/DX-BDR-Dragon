import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";

export function Modal({ open, title, children, onClose }: { open: boolean; title: string; children: ReactNode; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const element = dialog.current;
    if (open) { element?.showModal(); element?.querySelector<HTMLElement>('input, textarea, select')?.focus(); }
    else element?.close();
    return () => element?.close();
  }, [open]);
  if (!open) return null;

  return (
    <dialog ref={dialog} aria-labelledby={titleId} className="dragon-dialog" onCancel={event => { event.preventDefault(); onClose(); }}>
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 id={titleId} className="text-base font-semibold text-slate-950">{title}</h2>
          <button className="focus-ring rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-900" onClick={onClose} type="button" title="Close" aria-label="Close dialog">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
