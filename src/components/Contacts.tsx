import { Plus } from "lucide-react";
import { ChevronDown } from "lucide-react";
import { Button } from "./Button";
import { useState } from 'react';
import type { Contact } from '../data/model';
import { safeUrl } from '../data/model';
import { store, useWorkspace } from '../data/react';
import Messages from './Messages';
import { Confirm, Empty, ExternalLink, Field, InlineField, Modal } from './UI';

function ContactEditor({ accountId, onClose }: { accountId: string; onClose: () => void }) {
  const [form, setForm] = useState({ name: '', title: '', crmUrl: '', linkedinUrl: '', lastContactedDate: '' });
  const invalid = [form.crmUrl, form.linkedinUrl].some(value => value && !safeUrl(value));
  return <Modal title="Add Contact" onClose={onClose} onSubmit={event => { event.preventDefault(); if (!form.name.trim() || invalid) return; store.addContact({ ...form, accountId }); onClose(); }}>
    {([['name', 'Contact Name', 'text'], ['title', 'Title', 'text'], ['crmUrl', 'CRM Link', 'text'], ['linkedinUrl', 'LinkedIn Link', 'text'], ['lastContactedDate', 'Last Contacted Date', 'date']] as const).map(([key, label, type]) => <Field key={key} label={label}><input className="input" autoFocus={key === 'name'} required={key === 'name'} type={type} value={form[key]} onChange={event => setForm({ ...form, [key]: event.target.value })} /></Field>)}
    {invalid && <p role="alert" className="text-sm text-red-500">Links must use http or https.</p>}
  </Modal>;
}
export default function Contacts({ accountId }: { accountId: string }) {
  const data = useWorkspace(); const contacts = data.contacts.filter(contact => contact.accountId === accountId); const [adding, setAdding] = useState(false); const [deleting, setDeleting] = useState<Contact>();
  return <div className="space-y-4"><Button variant="primary" onClick={() => setAdding(true)}><Plus size={16} />Add Contact</Button>
    {!contacts.length && <Empty title="Keep your people in context">Add a contact to organize conversations and personalized messaging.</Empty>}
    {contacts.map(contact => <details className="record-card" key={contact.id}><summary className="flex justify-between gap-3 cursor-pointer items-center"><span className="min-w-0"><span className="font-medium break-words">{contact.name}</span>{contact.title && <span className="block text-sm muted break-words mt-1">{contact.title}</span>}</span><ChevronDown className="chevron" size={16} aria-hidden="true" /></summary>
      <div className="space-y-5 mt-6"><h3 className="section-label">Contact Information</h3><div className="grid gap-4 sm:grid-cols-2"><InlineField label="Name" required value={contact.name} onSave={name => store.update('contacts', contact.id, { name })} /><InlineField label="Title" value={contact.title} onSave={title => store.update('contacts', contact.id, { title })} />
        <div className="space-y-2"><InlineField label="CRM Link" type="url" value={contact.crmUrl} onSave={crmUrl => store.update('contacts', contact.id, { crmUrl })} />{contact.crmUrl && <ExternalLink value={contact.crmUrl} label="Open CRM" />}</div><div className="space-y-2"><InlineField label="LinkedIn Link" type="url" value={contact.linkedinUrl} onSave={linkedinUrl => store.update('contacts', contact.id, { linkedinUrl })} />{contact.linkedinUrl && <ExternalLink value={contact.linkedinUrl} label="Open LinkedIn" />}</div></div>
        <InlineField label="Last Contacted" type="date" value={contact.lastContactedDate} onSave={lastContactedDate => store.update('contacts', contact.id, { lastContactedDate })} />
        <InlineField label="Notes" multiline value={contact.notes} onSave={notes => store.update('contacts', contact.id, { notes })} />
        <section className="pt-4 border-t border-slate-200 "><h3 className="section-label mb-4">Custom Messaging</h3><Messages contactId={contact.id} /></section>
        <div className="flex justify-end"><Button variant="danger" className="h-8 px-2 text-xs" onClick={() => setDeleting(contact)}>Delete Contact</Button></div>
      </div></details>)}
    {adding && <ContactEditor accountId={accountId} onClose={() => setAdding(false)} />}
    {deleting && <Confirm title="Delete contact?" onClose={() => setDeleting(undefined)} onConfirm={() => { store.remove('contacts', deleting.id); setDeleting(undefined); }}>Delete “{deleting.name}” and all of their custom messages? Account templates and tasks are kept. This cannot be undone.</Confirm>}
  </div>;
}
