import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Pencil } from "lucide-react";
import { safeUrl } from "../data/model";

export function InlineField({ label, value, onSave, multiline = false, type = 'text', required = false }: { label: string; value: string; onSave: (value: string) => void; multiline?: boolean; type?: string; required?: boolean }) {
  const [draft, setDraft] = useState(value); const latest = useRef(value); const committed = useRef(value); const saveRef = useRef(onSave);
  useEffect(() => { saveRef.current = onSave; }, [onSave]);
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
  return <label className="field block min-w-0"><span>{label}</span><span className="relative block">{multiline ? <textarea {...props} rows={6} className="input focus-ring resize-y" /> : <input {...props} type={type === 'url' ? 'text' : type} className="input focus-ring pr-8" />}<span className="edit-cue" aria-hidden="true"><Pencil size={14} /></span></span>{invalid && <span className="text-xs text-red-500">{required && !draft.trim() ? 'A name is required.' : 'Use an http or https website address.'}</span>}</label>;
}
