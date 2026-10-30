import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Category, Task } from '../data/model';
import { orderedTasks } from '../data/model';
import { store, useWorkspace } from '../data/react';
import { Confirm, Empty, Field, Modal } from './UI';

export function TaskEditor({ task, category, accountId, onClose }: { task?: Task; category: Category; accountId?: string; onClose: () => void }) {
  const data = useWorkspace(); const account = data.accounts.find(a => a.id === accountId);
  const [name, setName] = useState(task?.name ?? ''); const [notes, setNotes] = useState(task?.notes ?? account?.name ?? '');
  return <Modal title={task ? 'Edit Task' : 'Add Task'} onClose={onClose} onSubmit={event => {
    event.preventDefault(); if (!name.trim()) return;
    if (task) store.update('tasks', task.id, { name: name.trim(), notes });
    else store.addTask({ name, notes, category, accountId }); onClose();
  }}><Field label="Task Name"><input autoFocus required className="input" value={name} onChange={event => setName(event.target.value)} /></Field>
    <Field label="Notes"><textarea className="input" rows={6} value={notes} onChange={event => setNotes(event.target.value)} /></Field></Modal>;
}
export function TaskList({ category, accountId }: { category: Category; accountId?: string }) {
  const data = useWorkspace(); const [editing, setEditing] = useState<Task>(); const [deleting, setDeleting] = useState<Task>(); const [dragging, setDragging] = useState<string>(); const [over, setOver] = useState<string>();
  const tasks = orderedTasks(data.tasks.filter(task => task.category === category && (!accountId || task.accountId === accountId)));
  const open = category === 'adhoc' ? tasks.filter(task => !task.isCompleted) : tasks;
  const completed = category === 'adhoc' ? tasks.filter(task => task.isCompleted).sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? '')) : [];
  const render = (task: Task, index: number, done = false) => {
    const account = data.accounts.find(a => a.id === task.accountId);
    return <article key={task.id} data-task-id={task.id} className={`task-card ${task.isCompleted ? 'completed' : ''} ${over === task.id ? 'drop-target' : ''} ${dragging === task.id ? 'dragging' : ''}`}>
      <div className="flex gap-3 items-start"><input type="checkbox" aria-label={`Complete ${task.name}`} checked={task.isCompleted} onChange={() => store.toggleTask(task.id)} className="task-check" />
        <div className="min-w-0 flex-1"><p className="task-name font-medium break-words">{task.name}</p>{account && <Link className="text-xs link" to={`/accounts?account=${encodeURIComponent(account.id)}`}>{account.name} ↗</Link>}
          {task.notes && <details className="mt-2 text-sm"><summary className="muted cursor-pointer">Notes</summary><p className="whitespace-pre-wrap break-words mt-2">{task.notes}</p></details>}
          {done && <p className="text-xs muted mt-1">Completed {new Date(task.completedAt!).toLocaleString()}</p>}
        </div>
        {!done && <button className="icon drag-handle" aria-label={`Drag ${task.name} to reorder`}
          onPointerDown={event => { if (event.button !== 0) return; event.preventDefault(); event.currentTarget.focus(); event.currentTarget.setPointerCapture(event.pointerId); setDragging(task.id); }}
          onPointerMove={event => { if (dragging !== task.id) return; const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-task-id]'); setOver(target?.dataset.taskId); }}
          onPointerUp={event => { if (dragging !== task.id) return; const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-task-id]'); if (target?.dataset.taskId) { const bounds = target.getBoundingClientRect(); store.moveTask(task.id, target.dataset.taskId, event.clientY > bounds.top + bounds.height / 2); } if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); setDragging(undefined); setOver(undefined); }}
          onPointerCancel={() => { setDragging(undefined); setOver(undefined); }}>⠿</button>}
      </div>
      <div className="task-actions flex flex-wrap gap-1 justify-end mt-2">
        {!done && <><button className="icon" aria-label={`Move ${task.name} up`} disabled={index === 0} onClick={() => store.moveTask(task.id, open[index - 1].id)}>↑</button><button className="icon" aria-label={`Move ${task.name} down`} disabled={index === open.length - 1} onClick={() => store.moveTask(task.id, open[index + 1].id, true)}>↓</button></>}
        {done && <button className="btn small" onClick={() => store.toggleTask(task.id)}>Reopen</button>}
        <button className="icon" aria-label={`Edit ${task.name}`} onClick={() => setEditing(task)}>✎</button><button className="icon danger" aria-label={`Delete ${task.name}`} onClick={() => setDeleting(task)}>×</button>
      </div>
    </article>;
  };
  return <>{category === 'adhoc' && <h3 className="section-label mb-3">Open Tasks <span className="count">{open.length}</span></h3>}
    <div className="space-y-2">{open.map((task, index) => render(task, index))}{!open.length && <Empty title={category === 'adhoc' ? 'No open tasks' : 'Build your routine'}>{category === 'adhoc' ? 'Add a task when something needs your attention.' : 'Add a recurring task to get started.'}</Empty>}</div>
    {category === 'adhoc' && <div className="mt-7"><h3 className="section-label mb-3">Completed Tasks <span className="count">{completed.length}</span></h3><div className="space-y-2">{completed.map((task, index) => render(task, index, true))}{!completed.length && <p className="muted text-sm">Completed tasks will appear here.</p>}</div></div>}
    {editing && <TaskEditor task={editing} category={category} onClose={() => setEditing(undefined)} />}
    {deleting && <Confirm title="Delete task?" onClose={() => setDeleting(undefined)} onConfirm={() => { store.remove('tasks', deleting.id); setDeleting(undefined); }}>Delete “{deleting.name}”? This removes the task from every view and cannot be undone.</Confirm>}
  </>;
}
