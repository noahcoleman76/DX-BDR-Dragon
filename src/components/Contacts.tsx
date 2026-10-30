import { ArrowLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "./Button";
import { useEffect, useRef, useState } from 'react';
import type { Contact } from '../data/model';
import { safeUrl } from '../data/model';
import { store, useWorkspace } from '../data/react';
import Messages from './Messages';
import { Confirm, Empty, ExternalLink, Field, InlineField, Modal } from './UI';

function ContactEditor({ accountId, onCreated, onClose }: { accountId: string; onCreated: (id: string) => void; onClose: () => void }) {
  const [form, setForm] = useState({ name: '', title: '', crmUrl: '', linkedinUrl: '', lastContactedDate: '' });
  const invalid = [form.crmUrl, form.linkedinUrl].some(value => value && !safeUrl(value));
  return <Modal title="Add Contact" onClose={onClose} onSubmit={event => { event.preventDefault(); if (!form.name.trim() || invalid) return; const id = store.addContact({ ...form, accountId }); onCreated(id); onClose(); }}>
    {([['name', 'Contact Name', 'text'], ['title', 'Title', 'text'], ['crmUrl', 'CRM Link', 'text'], ['linkedinUrl', 'LinkedIn Link', 'text'], ['lastContactedDate', 'Last Contacted Date', 'date']] as const).map(([key, label, type]) => <Field key={key} label={label}><input className="input" autoFocus={key === 'name'} required={key === 'name'} type={type} value={form[key]} onChange={event => setForm({ ...form, [key]: event.target.value })} /></Field>)}
    {invalid && <p role="alert" className="text-sm text-red-500">Links must use http or https.</p>}
  </Modal>;
}
function ContactDetail({ contact, onBack, onDelete }: { contact: Contact; onBack: () => void; onDelete: () => void }) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.closest('.workspace-content')?.scrollTo({ top: 0 });
    headingRef.current?.focus({ preventScroll: true });
  }, []);
  const save = (patch: Partial<Contact>) => store.update('contacts', contact.id, patch);
  return <section className="space-y-5" aria-label={`${contact.name} contact details`}>
    <Button variant="secondary" onClick={onBack}><ArrowLeft size={16} aria-hidden="true" />Back to contacts</Button>
    <header><h3 ref={headingRef} tabIndex={-1} className="text-xl font-semibold break-words">{contact.name}</h3>{contact.title && <p className="text-sm muted mt-1 break-words">{contact.title}</p>}</header>
    <section className="record-card space-y-5" aria-labelledby="contact-information-heading">
      <h4 id="contact-information-heading" className="section-label">Contact Information</h4>
      <div className="grid gap-4 sm:grid-cols-2">
        <InlineField label="Name" required value={contact.name} onSave={name => save({ name })} />
        <InlineField label="Title" value={contact.title} onSave={title => save({ title })} />
        <div className="space-y-2"><InlineField label="CRM Link" type="url" value={contact.crmUrl} onSave={crmUrl => save({ crmUrl })} />{contact.crmUrl && <ExternalLink value={contact.crmUrl} label="Open CRM" />}</div>
        <div className="space-y-2"><InlineField label="LinkedIn Link" type="url" value={contact.linkedinUrl} onSave={linkedinUrl => save({ linkedinUrl })} />{contact.linkedinUrl && <ExternalLink value={contact.linkedinUrl} label="Open LinkedIn" />}</div>
      </div>
      <div className="max-w-xs"><InlineField label="Last Contacted" type="date" value={contact.lastContactedDate} onSave={lastContactedDate => save({ lastContactedDate })} /></div>
      <InlineField label="Notes" multiline value={contact.notes} onSave={notes => save({ notes })} />
    </section>
    <section className="record-card" aria-labelledby="contact-messaging-heading"><h4 id="contact-messaging-heading" className="section-label mb-4">Custom Messaging</h4><Messages contactId={contact.id} /></section>
    <div className="flex justify-end"><Button variant="danger" className="h-8 px-2 text-xs" onClick={onDelete}>Delete Contact</Button></div>
  </section>;
}

export default function Contacts({ accountId }: { accountId: string }) {
  const data = useWorkspace();
  const contacts = data.contacts.filter(contact => contact.accountId === accountId);
  const [selectedId, setSelectedId] = useState<string>();
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<Contact>();
  const selected = contacts.find(contact => contact.id === selectedId);
  const listRef = useRef<HTMLDivElement>(null);
  const lastOpenedId = useRef<string | undefined>(undefined);
  const returning = useRef(false);
  useEffect(() => {
    if (!selectedId && returning.current) {
      returning.current = false;
      listRef.current?.closest('.workspace-content')?.scrollTo({ top: 0 });
      Array.from(listRef.current?.querySelectorAll<HTMLButtonElement>('[data-contact-id]') ?? []).find(button => button.dataset.contactId === lastOpenedId.current)?.focus({ preventScroll: true });
    }
  }, [selectedId]);
  const open = (id: string) => { lastOpenedId.current = id; setSelectedId(id); };
  return <div className="space-y-4">
    {selected ? <ContactDetail key={selected.id} contact={selected} onBack={() => { returning.current = true; setSelectedId(undefined); }} onDelete={() => setDeleting(selected)} /> : <div ref={listRef} className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="section-label">Contacts <span className="count">{contacts.length}</span></h3><Button variant="primary" onClick={() => setAdding(true)}><Plus size={16} />Add Contact</Button></div>
      {!contacts.length && <Empty title="Keep your people in context">Add a contact to organize conversations and personalized messaging.</Empty>}
      {contacts.map(contact => <button type="button" className="record-card contact-list-item" key={contact.id} data-contact-id={contact.id} aria-label={`Open contact ${contact.name}`} onClick={() => open(contact.id)}>
        <span className="min-w-0"><span className="font-medium break-words">{contact.name}</span>{contact.title && <span className="block text-sm muted break-words mt-1">{contact.title}</span>}</span><ChevronRight className="muted flex-shrink-0" size={18} aria-hidden="true" />
      </button>)}
    </div>}
    {adding && <ContactEditor accountId={accountId} onCreated={open} onClose={() => setAdding(false)} />}
    {deleting && <Confirm title="Delete contact?" onClose={() => setDeleting(undefined)} onConfirm={() => { store.remove('contacts', deleting.id); setSelectedId(undefined); setDeleting(undefined); }}>Delete “{deleting.name}” and all of their custom messages? Account templates and tasks are kept. This cannot be undone.</Confirm>}
  </div>;
}
