import { useState } from 'react';
import type { Message, MessageStatus, MessageType } from '../data/model';
import { orderedMessages } from '../data/model';
import { store, useWorkspace } from '../data/react';
import { Confirm, Empty, Field, Modal } from './UI';

const messageTypes: { value: MessageType; label: string }[] = [{ value: 'email', label: 'Email' }, { value: 'linkedin', label: 'LinkedIn' }, { value: 'call', label: 'Call Script' }];
function MessageEditor({ message, accountId, contactId, onClose }: { message?: Message; accountId?: string; contactId?: string; onClose: () => void }) {
  const [type, setType] = useState<MessageType>(message?.type ?? 'email'); const [status, setStatus] = useState<MessageStatus>(message?.status ?? 'current'); const [content, setContent] = useState(message?.content ?? '');
  return <Modal title={message ? 'Edit Message' : 'Add Message'} onClose={onClose} onSubmit={event => {
    event.preventDefault(); if (!content.trim()) return;
    if (message) store.update(contactId ? 'contactMessages' : 'accountMessages', message.id, { type, status, content });
    else store.addMessage({ type, status, content, ...(contactId ? { contactId } : { accountId }) }); onClose();
  }}><div className="grid grid-cols-2 gap-3"><Field label="Message Type"><select className="input" required value={type} onChange={event => setType(event.target.value as MessageType)}>{messageTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></Field>
    <Field label="Status"><select className="input" value={status} onChange={event => setStatus(event.target.value as MessageStatus)}><option value="current">Current</option><option value="previous">Previous</option></select></Field></div>
    <Field label="Message Template"><textarea autoFocus required className="input" rows={12} value={content} onChange={event => setContent(event.target.value)} /></Field></Modal>;
}
export default function Messages({ accountId, contactId }: { accountId?: string; contactId?: string }) {
  const data = useWorkspace(); const [filter, setFilter] = useState('all'); const [adding, setAdding] = useState(false); const [editing, setEditing] = useState<Message>(); const [deleting, setDeleting] = useState<Message>();
  const key = contactId ? 'contactMessages' : 'accountMessages';
  const messages = orderedMessages(data[key].filter(message => (contactId ? message.contactId === contactId : message.accountId === accountId) && (filter === 'all' || message.type === filter)));
  return <div className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><button className="btn primary" onClick={() => setAdding(true)}>+ Add Message</button><select aria-label="Filter message types" className="input w-auto" value={filter} onChange={event => setFilter(event.target.value)}><option value="all">All Types</option>{messageTypes.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}</select></div>
    {!messages.length && <Empty title="No messages yet">Keep useful {contactId ? 'personalized messages for this contact' : 'templates for this account'} here.</Empty>}
    {messages.map(message => <article key={message.id} className="record-card"><div className="flex justify-between gap-3 items-center mb-2"><div className="flex items-center flex-wrap gap-2"><span className={`badge ${message.status}`}>{message.status === 'current' ? 'Current' : 'Previous'}</span><span className="text-xs muted">{messageTypes.find(t => t.value === message.type)?.label}</span></div><div className="flex gap-1"><button className="icon" aria-label={`Edit ${messageTypes.find(t => t.value === message.type)?.label} message`} onClick={() => setEditing(message)}>✎</button><button className="icon danger" aria-label="Delete message" onClick={() => setDeleting(message)}>×</button></div></div>
      <details><summary className="message-preview cursor-pointer"><span className="line-clamp-2 whitespace-pre-wrap break-words">{message.content}</span><span className="chevron" aria-hidden="true">⌄</span></summary><p className="whitespace-pre-wrap break-words text-sm mt-4 leading-relaxed">{message.content}</p></details>
    </article>)}
    {(adding || editing) && <MessageEditor message={editing} accountId={accountId} contactId={contactId} onClose={() => { setAdding(false); setEditing(undefined); }} />}
    {deleting && <Confirm title="Delete message?" onClose={() => setDeleting(undefined)} onConfirm={() => { store.remove(key, deleting.id); setDeleting(undefined); }}>This permanently removes this message template.</Confirm>}
  </div>;
}
