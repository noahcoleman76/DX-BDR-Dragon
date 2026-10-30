import { Plus } from "lucide-react";
import { Pencil, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { AppSelect } from "../components/AppSelect";
import { Button } from "../components/Button";
import { PageHeader } from "../components/PageHeader";
import { useState } from 'react';
import type { CSSProperties } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Account } from '../data/model';
import { ownerKey, safeUrl } from '../data/model';
import { store, useWorkspace } from '../data/react';
import { Confirm, Empty, ExternalLink, Field, InlineField, Modal } from '../components/UI';
import Messages from '../components/Messages';
import Contacts from '../components/Contacts';
import { TaskEditor, TaskList } from '../components/TaskList';

function AccountEditor({ account, onClose, onCreated }: { account?: Account; onClose: () => void; onCreated: (id: string) => void }) {
  const [form, setForm] = useState({ name: account?.name ?? '', websiteUrl: account?.websiteUrl ?? '', crmUrl: account?.crmUrl ?? '', owner: account?.owner ?? '' });
  const invalid = [form.websiteUrl, form.crmUrl].some(value => value && !safeUrl(value));
  return <Modal title={account ? 'Edit Account' : 'Add Account'} onClose={onClose} onSubmit={event => { event.preventDefault(); if (!form.name.trim() || invalid) return; if (account) store.update('accounts', account.id, { ...form, name: form.name.trim(), owner: form.owner.trim() }); else onCreated(store.addAccount(form)); onClose(); }}>
    {([['name', 'Account Name'], ['websiteUrl', 'Website Link'], ['crmUrl', 'CRM Link'], ['owner', 'Owner']] as const).map(([key, label]) => <Field key={key} label={label}><input className="input" autoFocus={key === 'name'} required={key === 'name'} value={form[key]} onChange={event => setForm({ ...form, [key]: event.target.value })} /></Field>)}
    {invalid && <p role="alert" className="text-sm text-red-500">Links must use http or https.</p>}
  </Modal>;
}
function AccountWorkspace({ account, onBack }: { account: Account; onBack: () => void }) {
  const [tab, setTab] = useState('Overview'); const [editing, setEditing] = useState(false); const [deleting, setDeleting] = useState(false); const [addingTask, setAddingTask] = useState(false);
  const save = (patch: Partial<Account>) => store.update('accounts', account.id, patch);
  return <section className="panel account-workspace min-w-0"><header className="p-5"><Button variant="secondary" className="mobile-back mb-3 h-8 px-2 text-xs" onClick={onBack}>← Accounts</Button><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex items-center gap-2"><h2 className="text-xl font-semibold break-words min-w-0">{account.name}</h2><button className="icon flex-shrink-0" aria-label="Edit account" onClick={() => setEditing(true)}><Pencil size={16} /></button></div><p className="text-xs muted mt-2">Autosave on blur · Local browser</p></div><button className="icon danger" aria-label="Delete account" onClick={() => setDeleting(true)}><Trash2 size={16} /></button></div><div className="mt-4 max-w-xs"><InlineField key={account.owner} label="Owner" value={account.owner} onSave={owner => save({ owner: owner.trim() })} /></div></header>
    <div role="tablist" aria-label="Account sections" className="tabs">{['Overview', 'Messaging', 'Contacts', 'Tasks'].map((name, index, all) => <button key={name} id={`tab-${name}`} role="tab" aria-controls={`panel-${name}`} aria-selected={tab === name} tabIndex={tab === name ? 0 : -1} className={`tab ${tab === name ? 'active' : ''}`} onClick={() => setTab(name)} onKeyDown={event => { let next = index; if (event.key === 'ArrowRight') next = (index + 1) % all.length; else if (event.key === 'ArrowLeft') next = (index + all.length - 1) % all.length; else if (event.key === 'Home') next = 0; else if (event.key === 'End') next = all.length - 1; else return; event.preventDefault(); setTab(all[next]); document.getElementById(`tab-${all[next]}`)?.focus(); }}>{name}</button>)}</div>
    <div className="workspace-content p-5">
      <div role="tabpanel" id="panel-Overview" aria-labelledby="tab-Overview" hidden={tab !== 'Overview'} className="space-y-5"><div className="grid gap-5 sm:grid-cols-2"><div className="space-y-2"><InlineField key={account.websiteUrl} label="Website Link" value={account.websiteUrl} type="url" onSave={websiteUrl => save({ websiteUrl })} />{account.websiteUrl ? <ExternalLink value={account.websiteUrl} label="Open Website" /> : <span className="text-xs muted">Add a website link above</span>}</div><div className="space-y-2"><InlineField key={account.crmUrl} label="CRM Link" value={account.crmUrl} type="url" onSave={crmUrl => save({ crmUrl })} />{account.crmUrl ? <ExternalLink value={account.crmUrl} label="Open CRM" /> : <span className="text-xs muted">Add a CRM link above</span>}</div></div>
        <div className="max-w-xs"><InlineField label="Last Worked" value={account.lastWorkedDate} type="date" onSave={lastWorkedDate => save({ lastWorkedDate })} /></div><InlineField label="Company Description" value={account.companyDescription} multiline onSave={companyDescription => save({ companyDescription })} /><InlineField label="Notes" value={account.notes} multiline onSave={notes => save({ notes })} /><p className="text-xs muted">Last saved {new Date(account.updatedAt).toLocaleString()}</p></div>
      <div role="tabpanel" id="panel-Messaging" aria-labelledby="tab-Messaging" hidden={tab !== 'Messaging'}><Messages accountId={account.id} /></div>
      <div role="tabpanel" id="panel-Contacts" aria-labelledby="tab-Contacts" hidden={tab !== 'Contacts'}><Contacts accountId={account.id} /></div>
      <div role="tabpanel" id="panel-Tasks" aria-labelledby="tab-Tasks" hidden={tab !== 'Tasks'}><Button variant="primary" className="mb-5" onClick={() => setAddingTask(true)}><Plus size={16} />Add Task</Button><TaskList category="adhoc" accountId={account.id} /></div>
    </div>
    {editing && <AccountEditor account={account} onCreated={() => {}} onClose={() => setEditing(false)} />}
    {deleting && <Confirm title="Delete account?" onClose={() => setDeleting(false)} onConfirm={() => { store.remove('accounts', account.id); setDeleting(false); onBack(); }}>Delete “{account.name}”, its contacts, and all account and contact messages? Tasks are kept in the main Tasks page and become unassigned. This cannot be undone.</Confirm>}
    {addingTask && <TaskEditor category="adhoc" accountId={account.id} onClose={() => setAddingTask(false)} />}
  </section>;
}
export default function AccountsPage() {
  const data = useWorkspace(); const [params, setParams] = useSearchParams(); const [query, setQuery] = useState(''); const [owner, setOwner] = useState('all'); const [adding, setAdding] = useState(false); const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const selected = data.accounts.find(account => account.id === params.get('account'));
  const owners = [...new Map(data.accounts.filter(a => a.owner.trim()).map(a => [ownerKey(a.owner), a.owner])).entries()].sort((a, b) => a[1].localeCompare(b[1]));
  const accounts = data.accounts.filter(account => account.name.toLocaleLowerCase().includes(query.toLocaleLowerCase()) && (owner === 'all' || (owner === 'unassigned' ? !account.owner.trim() : `owner:${ownerKey(account.owner)}` === owner)));
  const select = (id: string) => setParams({ account: id });
  return <div className="space-y-4"><PageHeader title="Accounts" description="Account context, conversations, and the next step. Together." /><div className={`account-grid ${selected ? 'has-selection' : ''}`}>
    <aside className="panel account-list min-w-0" aria-label="Account list"><div className="p-4 space-y-3 border-b border-slate-200 "><input className="input" type="search" aria-label="Search accounts" placeholder="Search accounts…" value={query} onChange={event => setQuery(event.target.value)} /><div className="flex gap-2"><div className="min-w-0 flex-1"><AppSelect label="Owner filter" value={owner} onChange={setOwner} options={[{ value: "all", label: "All Owners" }, { value: "unassigned", label: "Unassigned" }, ...owners.map(([key, label]) => ({ value: `owner:${key}`, label }))]} /></div><Button variant="primary" className="whitespace-nowrap" onClick={() => setAdding(true)}><Plus size={16} />Add Account</Button></div><p className="text-xs muted">{accounts.length} {accounts.length === 1 ? 'account' : 'accounts'}</p></div>
      <div className="account-list-scroll p-3 space-y-2">{accounts.map(account => <article className={`account-card ${selected?.id === account.id ? 'selected' : ''}`} key={account.id} style={{ '--account-color': account.owner ? data.ownerColors[ownerKey(account.owner)] : undefined } as CSSProperties}><div className="flex items-center"><button className="account-select min-w-0 flex-1 text-left p-3" aria-pressed={selected?.id === account.id} onClick={() => select(account.id)}><span className="block font-medium break-words">{account.name}</span>{account.owner && <span className="block text-xs muted mt-1 break-words">{account.owner}</span>}</button><button className="icon mr-2" aria-label={`Expand ${account.name}`} aria-expanded={expanded.has(account.id)} onClick={() => setExpanded(previous => { const next = new Set(previous); if (next.has(account.id)) next.delete(account.id); else next.add(account.id); return next; })}>{expanded.has(account.id) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</button></div>
        {expanded.has(account.id) && <div className="px-3 pb-3 flex flex-col gap-2">{account.lastWorkedDate && <p className="text-xs muted">Last worked: <time dateTime={account.lastWorkedDate}>{new Date(`${account.lastWorkedDate}T00:00:00`).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</time></p>}{account.websiteUrl && <ExternalLink value={account.websiteUrl} label="Website" />}{account.crmUrl && <ExternalLink value={account.crmUrl} label="CRM" />}{!account.websiteUrl && !account.crmUrl && <p className="text-xs muted">No links added.</p>}</div>}
      </article>)}{!accounts.length && <Empty title={data.accounts.length ? 'No matching accounts' : 'Your accounts start here'}>{data.accounts.length ? 'Try a different name or owner filter.' : 'Add your first account with just a name.'}</Empty>}</div>
    </aside>{selected ? <AccountWorkspace key={selected.id} account={selected} onBack={() => setParams({})} /> : <section className="panel account-workspace"><Empty title="A workspace for every account">Select an account, or add one to get started.</Empty></section>}
  </div>{adding && <AccountEditor onCreated={select} onClose={() => setAdding(false)} />}</div>;
}
