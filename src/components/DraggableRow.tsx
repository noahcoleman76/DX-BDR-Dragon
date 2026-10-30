import { useDraggable } from "@dnd-kit/core";
import { useDroppable } from "@dnd-kit/core";
import { GripVertical } from "lucide-react";
import type { ReactNode } from "react";

export function DraggableRow({ id, children, label }: { id: string; children: ReactNode; label?: string }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id });
  const { setNodeRef: setDropNodeRef, isOver } = useDroppable({ id });
  const setRefs = (node: HTMLDivElement | null) => {
    setNodeRef(node);
    setDropNodeRef(node);
  };
  return (
    <div
      ref={setRefs}
      data-task-id={id}
      className={`relative rounded-lg border bg-white p-2 shadow-sm ${isDragging ? "opacity-40" : ""} ${isOver ? "border-sky-300 ring-2 ring-sky-100" : "border-slate-200"}`}
    >
      <div className="flex items-center gap-2">
        <button className="cursor-grab touch-none text-slate-300 hover:text-slate-500" {...listeners} {...attributes} aria-label={label ?? 'Drag to reorder'} type="button">
          <GripVertical size={16} />
        </button>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}

export function DragPreview({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="pointer-events-none w-72 rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-xl ring-2 ring-sky-200">
      <div className="truncate font-medium text-slate-900">{title}</div>
      {subtitle ? <div className="mt-1 truncate text-xs text-slate-500">{subtitle}</div> : null}
    </div>
  );
}
