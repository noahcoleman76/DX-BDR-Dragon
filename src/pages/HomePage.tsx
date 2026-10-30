import { BriefcaseBusiness, CheckSquare, Pencil, ArrowUpRight } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Field, Modal } from '../components/UI';
import { store, useWorkspace } from '../data/react';
import { getWorkspaceSummary } from '../data/summary';

function NameEditor({ name, onClose }: { name: string; onClose: () => void }) {
  const [draft, setDraft] = useState(name);
  return <Modal title="Edit SDR name" onClose={onClose} onSubmit={event => {
    event.preventDefault();
    if (!draft.trim()) return;
    store.setSdrName(draft); onClose();
  }}><Field label="SDR Name"><input className="input" autoFocus required value={draft} onChange={event => setDraft(event.target.value)} /></Field></Modal>;
}

export default function HomePage() {
  const data = useWorkspace();
  const [editing, setEditing] = useState(false);
  const { activeTasks, totalAccounts, accountsByExecutive } = getWorkspaceSummary(data);
  return <div className="space-y-6">
    <header className="home-header">
      <p className="text-sm muted mb-2">SDR Workspace</p>
      <div className="flex items-center gap-3 min-w-0">
        <h1 className="home-sdr-name min-w-0 break-words">{data.sdrName || 'SDR Name'}</h1>
        <button className="icon flex-shrink-0" aria-label="Edit SDR name" title="Edit SDR name" onClick={() => setEditing(true)}><Pencil size={20} /></button>
      </div>
      <div className="accent-divider mt-4 w-24" />
    </header>

    <div className="home-summary-grid">
      <section className="panel home-summary-card" aria-labelledby="active-tasks-heading">
        <div className="flex items-center justify-between gap-3"><h2 id="active-tasks-heading" className="text-lg font-semibold">Active Tasks</h2><CheckSquare className="home-summary-icon" size={24} aria-hidden="true" /></div>
        <p className="home-summary-total">{activeTasks.total}</p>
        <h3 className="section-label mb-3">By category</h3>
        <dl className="home-breakdown">
          <div><dt>Daily Recurring Tasks</dt><dd>{activeTasks.daily}</dd></div>
          <div><dt>Weekly Recurring Tasks</dt><dd>{activeTasks.weekly}</dd></div>
          <div><dt>To-Dos</dt><dd>{activeTasks.adhoc}</dd></div>
        </dl>
        <Link className="home-summary-link link" to="/tasks">View tasks <ArrowUpRight size={15} aria-hidden="true" /></Link>
      </section>

      <section className="panel home-summary-card" aria-labelledby="accounts-heading">
        <div className="flex items-center justify-between gap-3"><h2 id="accounts-heading" className="text-lg font-semibold">Accounts</h2><BriefcaseBusiness className="home-summary-icon" size={24} aria-hidden="true" /></div>
        <p className="home-summary-total">{totalAccounts}</p>
        <h3 className="section-label mb-3">By Account Executive</h3>
        <dl className="home-breakdown">{accountsByExecutive.map(executive => <div key={executive.key}>
          <dt className="flex items-center gap-2"><span className="home-executive-dot" style={{ backgroundColor: data.ownerColors[executive.key] ?? 'var(--text-muted)' }} aria-hidden="true" />{executive.name}</dt><dd>{executive.count}</dd>
        </div>)}</dl>
        {!accountsByExecutive.length && <p className="text-sm muted">Account Executive counts will appear as you add accounts.</p>}
        <Link className="home-summary-link link" to="/accounts">View accounts <ArrowUpRight size={15} aria-hidden="true" /></Link>
      </section>
    </div>
    {editing && <NameEditor name={data.sdrName ?? ''} onClose={() => setEditing(false)} />}
  </div>;
}
