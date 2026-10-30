import { emptyData, orderedTasks, ownerKey, periodFor } from './model.ts';
import type { Account, Category, Contact, Message, Task, WorkspaceData } from './model.ts';

export const STORAGE_KEY = 'bdr-workspace:v1';
export interface Persistence { read(): WorkspaceData | null; write(data: WorkspaceData): void }
const arrays = ['accounts', 'contacts', 'accountMessages', 'contactMessages', 'tasks'] as const;
export class LocalPersistence implements Persistence {
  private storage: Pick<Storage, 'getItem' | 'setItem'>;
  constructor(storage: Pick<Storage, 'getItem' | 'setItem'>) { this.storage = storage; }
  read() {
    const raw = this.storage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as WorkspaceData;
    if (data.version !== 1 || arrays.some(key => !Array.isArray(data[key])) || !data.ownerColors || typeof data.ownerColors !== 'object') throw new Error('Unrecognized saved data. Existing storage has been preserved.');
    for (const key of arrays) {
      if (data[key].some(row => !row || typeof row.id !== 'string' || typeof row.createdAt !== 'string' || typeof row.updatedAt !== 'string')) throw new Error('Invalid saved records. Existing storage has been preserved.');
    }
    if (data.accounts.some(a => typeof a.name !== 'string' || typeof a.owner !== 'string') || data.tasks.some(t => !['daily', 'weekly', 'adhoc'].includes(t.category) || typeof t.name !== 'string' || typeof t.sortOrder !== 'number')) throw new Error('Invalid saved data. Existing storage has been preserved.');
    return data;
  }
  write(data: WorkspaceData) { this.storage.setItem(STORAGE_KEY, JSON.stringify(data)); }
}
type Collection = typeof arrays[number];
type Row = Account | Contact | Message | Task;
export class WorkspaceStore {
  private data: WorkspaceData = emptyData();
  private listeners = new Set<() => void>();
  private blocked = false;
  private persistence: Persistence;
  private clock: () => Date;
  error = '';
  constructor(persistence: Persistence, clock: () => Date = () => new Date()) {
    this.persistence = persistence; this.clock = clock;
    try { this.data = persistence.read() ?? emptyData(); }
    catch (error) { this.blocked = true; this.error = `Unable to read local records: ${String(error)} Close this page and recover your browser storage before making changes.`; }
    this.refreshRecurrences();
  }
  getSnapshot = () => this.data;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private publish(next: WorkspaceData) {
    if (this.blocked) return;
    this.data = next;
    try { this.persistence.write(next); this.error = ''; }
    catch { this.error = 'Changes are only in memory: local storage is unavailable or full. Keep this tab open and retry saving before closing.'; }
    this.listeners.forEach(listener => listener());
  }
  retrySave = () => this.publish({ ...this.data });
  private stamp() { return this.clock().toISOString(); }
  private base() { const now = this.stamp(); return { id: crypto.randomUUID(), createdAt: now, updatedAt: now }; }
  addAccount(input: Pick<Account, 'name' | 'websiteUrl' | 'crmUrl' | 'owner'>) {
    if (!input.name.trim()) throw new Error('Account name is required.');
    const account: Account = { ...this.base(), ...input, name: input.name.trim(), owner: input.owner.trim(), lastWorkedDate: '', companyDescription: '', notes: '' };
    this.publish(this.withOwner({ ...this.data, accounts: [account, ...this.data.accounts] }, account.owner));
    return account.id;
  }
  private withOwner(data: WorkspaceData, owner: string) {
    const key = ownerKey(owner);
    if (key && !Object.hasOwn(data.ownerColors, key)) return { ...data, ownerColors: { ...data.ownerColors, [key]: `hsl(${Math.round(Object.keys(data.ownerColors).length * 137.508 + 210) % 360} 62% 48%)` } };
    return data;
  }
  update(collection: Collection, id: string, patch: Partial<Row>) {
    const rows = this.data[collection].map(row => row.id === id ? { ...row, ...patch, id: row.id, createdAt: row.createdAt, updatedAt: this.stamp() } : row);
    let next = { ...this.data, [collection]: rows };
    if (collection === 'accounts') next = this.withOwner(next, (rows.find(row => row.id === id) as Account)?.owner ?? '');
    this.publish(next);
  }
  remove(collection: Collection, id: string) {
    if (collection === 'accounts') { this.removeAccount(id); return; }
    const next = { ...this.data, [collection]: this.data[collection].filter(row => row.id !== id) };
    if (collection === 'contacts') next.contactMessages = next.contactMessages.filter(message => message.contactId !== id);
    this.publish(next);
  }
  private removeAccount(id: string) {
    const contactIds = new Set(this.data.contacts.filter(c => c.accountId === id).map(c => c.id));
    this.publish({ ...this.data,
      accounts: this.data.accounts.filter(a => a.id !== id), contacts: this.data.contacts.filter(c => c.accountId !== id),
      accountMessages: this.data.accountMessages.filter(m => m.accountId !== id), contactMessages: this.data.contactMessages.filter(m => !contactIds.has(m.contactId ?? '')),
      tasks: this.data.tasks.map(task => task.accountId === id ? { ...task, accountId: null, updatedAt: this.stamp() } : task),
    });
  }
  addContact(input: Omit<Contact, 'id' | 'createdAt' | 'updatedAt' | 'notes'>) {
    if (!input.name.trim() || !this.data.accounts.some(a => a.id === input.accountId)) throw new Error('A name and existing account are required.');
    const contact = { ...this.base(), ...input, name: input.name.trim(), notes: '' };
    this.publish({ ...this.data, contacts: [contact, ...this.data.contacts] }); return contact.id;
  }
  addMessage(input: Pick<Message, 'type' | 'status' | 'content' | 'accountId' | 'contactId'>) {
    if (!input.content.trim() || !['email', 'linkedin', 'call'].includes(input.type) || !['current', 'previous'].includes(input.status)) throw new Error('Message type and content are required.');
    if (!!input.accountId === !!input.contactId) throw new Error('A message belongs to exactly one account or contact.');
    if (input.accountId && !this.data.accounts.some(a => a.id === input.accountId) || input.contactId && !this.data.contacts.some(c => c.id === input.contactId)) throw new Error('Message parent no longer exists.');
    const key = input.contactId ? 'contactMessages' : 'accountMessages';
    this.publish({ ...this.data, [key]: [{ ...this.base(), ...input }, ...this.data[key]] });
  }
  addTask(input: { name: string; notes: string; category: Category; accountId?: string | null }) {
    if (!input.name.trim()) throw new Error('Task name is required.');
    if (input.accountId && (input.category !== 'adhoc' || !this.data.accounts.some(a => a.id === input.accountId))) throw new Error('Only ad hoc tasks may belong to an existing account.');
    const task: Task = { ...this.base(), ...input, name: input.name.trim(), accountId: input.accountId ?? null, isCompleted: false, completedAt: null, completedPeriod: null, sortOrder: this.topOrder(input.category) };
    this.publish({ ...this.data, tasks: [task, ...this.data.tasks] }); return task.id;
  }
  private topOrder(category: Category) { return Math.min(0, ...this.data.tasks.filter(t => t.category === category).map(t => t.sortOrder)) - 1; }
  toggleTask(id: string) {
    this.refreshRecurrences();
    const task = this.data.tasks.find(t => t.id === id); if (!task) return;
    const isCompleted = !task.isCompleted;
    this.update('tasks', id, { isCompleted, completedAt: isCompleted ? this.stamp() : null, completedPeriod: isCompleted ? periodFor(task.category, this.clock()) : null, sortOrder: !isCompleted && task.category === 'adhoc' ? this.topOrder(task.category) : task.sortOrder });
  }
  moveTask(id: string, targetId: string, after = false) {
    const task = this.data.tasks.find(t => t.id === id); const target = this.data.tasks.find(t => t.id === targetId);
    if (!task || !target || id === targetId || task.category !== target.category || task.category === 'adhoc' && (task.isCompleted || target.isCompleted)) return;
    const sorted = orderedTasks(this.data.tasks.filter(t => t.category === task.category && t.id !== id));
    sorted.splice(sorted.findIndex(t => t.id === targetId) + Number(after), 0, task);
    const order = new Map(sorted.map((t, index) => [t.id, index]));
    this.publish({ ...this.data, tasks: this.data.tasks.map(t => order.has(t.id) ? { ...t, sortOrder: order.get(t.id)!, updatedAt: this.stamp() } : t) });
  }
  refreshRecurrences = () => {
    let changed = false;
    const tasks = this.data.tasks.map(task => {
      if (task.category !== 'adhoc' && task.isCompleted && task.completedPeriod !== periodFor(task.category, this.clock())) {
        changed = true; return { ...task, isCompleted: false, completedAt: null, completedPeriod: null, updatedAt: this.stamp() };
      } return task;
    });
    if (changed) this.publish({ ...this.data, tasks });
  };
}
