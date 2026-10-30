import { Plus } from "lucide-react";
import { Button } from "../components/Button";
import { PageHeader } from "../components/PageHeader";
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
  return <div className="space-y-4"><PageHeader title="Tasks" description="Keep your routines steady and your next steps clear." />
    <div className="task-grid">{sections.map(section => <section className="panel p-4 min-w-0" key={section.category}><div className="flex justify-between items-start gap-3 mb-5"><div><h2 className="font-semibold">{section.title}</h2><p className="text-xs muted mt-1">{section.description}</p></div><Button variant="secondary" className="whitespace-nowrap h-8 px-2 text-xs" onClick={() => setAdding(section.category)} aria-label={`Add ${section.title}`}><Plus size={16} />Add Task</Button></div><TaskList category={section.category} /></section>)}</div>
    {adding && <TaskEditor category={adding} onClose={() => setAdding(undefined)} />}
  </div>;
}
