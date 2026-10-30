import { useState } from 'react';
import type { Category } from '../data/model';
import { TaskEditor, TaskList } from '../components/TaskList';

const sections: { category: Category; title: string; description: string }[] = [
  { category: 'daily', title: 'Daily Recurring Tasks', description: 'A fresh start every local calendar day.' },
  { category: 'weekly', title: 'Weekly Recurring Tasks', description: 'Resets every Monday, in your local time.' },
  { category: 'adhoc', title: 'Ad Hoc Tasks', description: 'One-time work, including tasks from your accounts.' },
];
export default function TasksPage() {
  const [adding, setAdding] = useState<Category>();
  return <div className="space-y-4"><header className="panel p-4"><h1 className="text-xl font-semibold">Tasks</h1><p className="muted text-sm mt-1">Keep your routines steady and your next steps clear.</p></header>
    <div className="task-grid">{sections.map(section => <section className="panel p-4 min-w-0" key={section.category}><div className="flex justify-between items-start gap-3 mb-5"><div><h2 className="font-semibold">{section.title}</h2><p className="text-xs muted mt-1">{section.description}</p></div><button className="btn small whitespace-nowrap" onClick={() => setAdding(section.category)} aria-label={`Add ${section.title}`}>+ Add Task</button></div><TaskList category={section.category} /></section>)}</div>
    {adding && <TaskEditor category={adding} onClose={() => setAdding(undefined)} />}
  </div>;
}
