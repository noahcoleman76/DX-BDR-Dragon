import { Pencil, Trash2, Link2 } from "lucide-react";
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { DraggableRow, DragPreview } from './DraggableRow';
import { Button } from "./Button";
import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Category, Task } from '../data/model';
import { orderedTasks, safeUrl } from '../data/model';
import { store, useWorkspace } from '../data/react';
import { Confirm, Empty, Field, Modal } from './UI';

export function TaskEditor({ task, category, accountId, onClose }: { task?: Task; category: Category; accountId?: string; onClose: () => void }) {
  const data = useWorkspace(); const account = data.accounts.find(a => a.id === accountId);
  const [name, setName] = useState(task?.name ?? ''); const [notes, setNotes] = useState(task?.notes ?? account?.name ?? '');
  const [linkUrl, setLinkUrl] = useState(task?.linkUrl ?? '');
  const invalidLink = !!linkUrl.trim() && !safeUrl(linkUrl.trim());
  return <Modal title={task ? 'Edit Task' : 'Add Task'} onClose={onClose} onSubmit={event => {
    event.preventDefault(); if (!name.trim() || invalidLink) return;
    const link = safeUrl(linkUrl.trim()) ?? '';
    if (task) store.update('tasks', task.id, { name: name.trim(), notes, linkUrl: link });
    else store.addTask({ name, notes, category, accountId, linkUrl: link }); onClose();
  }}><Field label="Task Name"><input autoFocus required className="input" value={name} onChange={event => setName(event.target.value)} /></Field>
    <Field label="Link"><input className="input" inputMode="url" placeholder="https://example.com" value={linkUrl} onChange={event => setLinkUrl(event.target.value)} aria-invalid={invalidLink} aria-describedby={invalidLink ? 'task-link-error' : undefined} /></Field>
    {invalidLink && <p id="task-link-error" role="alert" className="text-sm text-red-500">Use an http or https website address.</p>}
    <Field label="Notes"><textarea className="input" rows={6} value={notes} onChange={event => setNotes(event.target.value)} /></Field></Modal>;
}
export function TaskList({ category, accountId, mode = 'all' }: { category?: Category; accountId?: string; mode?: 'all' | 'open' | 'completed' }) {
  const data = useWorkspace(); const [editing, setEditing] = useState<Task>(); const [deleting, setDeleting] = useState<Task>(); const [dragging, setDragging] = useState<string>();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const tasks = orderedTasks(data.tasks.filter(task => (!category || task.category === category) && (!accountId || task.accountId === accountId)));
  const open = mode === 'open' || category === 'adhoc' ? tasks.filter(task => !task.isCompleted) : tasks;
  const completed = tasks.filter(task => task.isCompleted).sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''));
  const render = (task: Task, done = false) => {
    const account = data.accounts.find(a => a.id === task.accountId);
    const href = safeUrl(task.linkUrl ?? '');
    const content = <article className={`${done ? 'task-card' : 'task-content'} ${task.isCompleted ? 'completed' : ''}`}>
      <div className="flex gap-3 items-start"><input type="checkbox" aria-label={`Complete ${task.name}`} checked={task.isCompleted} onChange={() => store.toggleTask(task.id)} className="task-check" />
        <div className="min-w-0 flex-1"><p className="task-name font-medium break-words">{task.name}</p>{account && <Link className="text-xs link" to={`/accounts?account=${encodeURIComponent(account.id)}`}>{account.name} ↗</Link>}
          {task.notes && <details className="mt-2 text-sm"><summary className="muted cursor-pointer">Notes</summary><p className="whitespace-pre-wrap break-words mt-2">{task.notes}</p></details>}
          {done && <p className="text-xs muted mt-1">{!category && <>{task.category === 'daily' ? 'Daily Recurring Tasks' : task.category === 'weekly' ? 'Weekly Recurring Tasks' : 'To-Dos'} · </>}Completed {new Date(task.completedAt!).toLocaleString()}</p>}
        </div>
      </div>
      <div className="task-actions flex flex-wrap gap-1 justify-end mt-2">
        {href && <a className="icon" href={href} target="_blank" rel="noopener noreferrer" aria-label={`Open link for ${task.name}`} title={href}><Link2 size={16} aria-hidden="true" /></a>}
        {done && <Button variant="secondary" className="h-8 px-2 text-xs" onClick={() => store.toggleTask(task.id)}>Reopen</Button>}
        <button className="icon" aria-label={`Edit ${task.name}`} onClick={() => setEditing(task)}><Pencil size={16} /></button><button className="icon danger" aria-label={`Delete ${task.name}`} onClick={() => setDeleting(task)}><Trash2 size={16} /></button>
      </div>
    </article>;
    return done ? <div key={task.id}>{content}</div> : <DraggableRow key={task.id} id={task.id} label={`Drag ${task.name} to reorder`}>{content}</DraggableRow>;
  };
  return <>{mode === 'all' && category === 'adhoc' && <h3 className="section-label mb-3">Open Tasks <span className="count">{open.length}</span></h3>}
    {mode !== 'completed' && <DndContext sensors={sensors} onDragStart={event => setDragging(String(event.active.id))} onDragCancel={() => setDragging(undefined)} onDragEnd={event => {
      setDragging(undefined);
      if (!event.over) return;
      const activeId = String(event.active.id); const overId = String(event.over.id);
      if (!open.some(task => task.id === overId)) return;
      const active = event.active.rect.current.translated; const over = event.over.rect;
      store.moveTask(activeId, overId, !!active && active.top + active.height / 2 > over.top + over.height / 2);
    }}><div className="space-y-2">{open.map(task => render(task))}{!open.length && <Empty title={category === 'adhoc' ? 'No open tasks' : tasks.length ? 'All tasks completed' : 'Build your routine'}>{category === 'adhoc' ? 'Add a task when something needs your attention.' : tasks.length ? 'Your completed tasks are listed below.' : 'Add a recurring task to get started.'}</Empty>}</div><DragOverlay zIndex={1000}>{dragging && <DragPreview title={open.find(task => task.id === dragging)?.name ?? ''} />}</DragOverlay></DndContext>}
    {(mode === 'completed' || (mode === 'all' && category === 'adhoc')) && <div className={mode === 'completed' ? '' : 'mt-7'}>{mode === 'completed' ? <h2 className="font-semibold mb-3">Completed Tasks <span className="count">{completed.length}</span></h2> : <h3 className="section-label mb-3">Completed Tasks <span className="count">{completed.length}</span></h3>}<div className="space-y-2">{completed.map(task => render(task, true))}{!completed.length && <p className="muted text-sm">Completed tasks will appear here.</p>}</div></div>}
    {editing && <TaskEditor task={editing} category={editing.category} onClose={() => setEditing(undefined)} />}
    {deleting && <Confirm title="Delete task?" onClose={() => setDeleting(undefined)} onConfirm={() => { store.remove('tasks', deleting.id); setDeleting(undefined); }}>Delete “{deleting.name}”? This removes the task from every view and cannot be undone.</Confirm>}
  </>;
}
