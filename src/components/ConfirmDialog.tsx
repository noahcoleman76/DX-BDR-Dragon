import { AlertTriangle } from "lucide-react";
import { Button } from "./Button";
import { useEffect, useId, useRef, type ReactNode } from "react";

type Props = {
  open: boolean;
  title: string;
  description: ReactNode;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmDialog({ open, title, description, onCancel, onConfirm }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => { const element = dialog.current; if (open) element?.showModal(); else element?.close(); return () => element?.close(); }, [open]);
  if (!open) return null;
  return (
    <dialog ref={dialog} aria-labelledby={titleId} className="dragon-dialog confirm-dialog" onCancel={event => { event.preventDefault(); onCancel(); }}>
      <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
        <div className="mb-3 flex items-center gap-2 text-rose-600">
          <AlertTriangle size={20} />
          <h2 id={titleId} className="text-base font-semibold">{title}</h2>
        </div>
        <p className="text-sm leading-6 text-slate-600">{description}</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button onClick={onCancel}>Cancel</Button>
          <Button variant="danger" onClick={onConfirm}>Delete</Button>
        </div>
      </div>
    </dialog>
  );
}
