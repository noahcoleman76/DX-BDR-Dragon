import { Plus } from "lucide-react";
import { Pencil, Trash2, ChevronDown } from "lucide-react";
import { AppSelect } from "./AppSelect";
import { Button } from "./Button";
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
  }}><div className="grid grid-cols-2 gap-3"><Field label="Message Type"><AppSelect label="Message Type" value={type} onChange={setType} options={messageTypes} /></Field>
    <Field label="Status"><AppSelect label="Status" value={status} onChange={setStatus} options={[{ value: "current", label: "Current" }, { value: "previous", label: "Previous" }]} /></Field></div>
    <Field label="Message Template"><textarea autoFocus required className="input" rows={12} value={content} onChange={event => setContent(event.target.value)} /></Field></Modal>;
}
export default function Messages({ accountId, contactId }: { accountId?: string; contactId?: string }) {
  const data = useWorkspace(); const [filter, setFilter] = useState('all'); const [adding, setAdding] = useState(false); const [editing, setEditing] = useState<Message>(); const [deleting, setDeleting] = useState<Message>();
  const key = contactId ? 'contactMessages' : 'accountMessages';
  const messages = orderedMessages(data[key].filter(message => (contactId ? message.contactId === contactId : message.accountId === accountId) && (filter === 'all' || message.type === filter)));
  return <div className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><Button variant="primary" onClick={() => setAdding(true)}><Plus size={16} />Add Message</Button><div className="w-44"><AppSelect label="Message type filter" value={filter} onChange={setFilter} options={[{ value: "all", label: "All Types" }, ...messageTypes]} /></div></div>
    {!messages.length && <Empty title="No messages yet">Keep useful {contactId ? 'personalized messages for this contact' : 'templates for this account'} here.</Empty>}
    {messages.map(message => <article key={message.id} className="record-card"><div className="flex justify-between gap-3 items-center mb-2"><div className="flex items-center flex-wrap gap-2"><span className={`badge ${message.status}`}>{message.status === 'current' ? 'Current' : 'Previous'}</span><span className="text-xs muted">{messageTypes.find(t => t.value === message.type)?.label}</span></div><div className="flex gap-1"><button className="icon" aria-label={`Edit ${messageTypes.find(t => t.value === message.type)?.label} message`} onClick={() => setEditing(message)}><Pencil size={16} /></button><button className="icon danger" aria-label="Delete message" onClick={() => setDeleting(message)}><Trash2 size={16} /></button></div></div>
      <details><summary className="message-preview cursor-pointer"><span className="line-clamp-2 whitespace-pre-wrap break-words">{message.content}</span><ChevronDown className="chevron" size={16} aria-hidden="true" /></summary><p className="whitespace-pre-wrap break-words text-sm mt-4 leading-relaxed">{message.content}</p></details>
    </article>)}
    {(adding || editing) && <MessageEditor message={editing} accountId={accountId} contactId={contactId} onClose={() => { setAdding(false); setEditing(undefined); }} />}
    {deleting && <Confirm title="Delete message?" onClose={() => setDeleting(undefined)} onConfirm={() => { store.remove(key, deleting.id); setDeleting(undefined); }}>This permanently removes this message template.</Confirm>}
  </div>;
}
