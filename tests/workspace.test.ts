import test from 'node:test';
import assert from 'node:assert/strict';
import { LocalPersistence, STORAGE_KEY, WorkspaceStore } from '../src/data/store.ts';
import { orderedMessages, orderedTasks, ownerKey, periodFor, localDate, safeUrl } from '../src/data/model.ts';
import type { Message } from '../src/data/model.ts';

function setup(initialDate = new Date(2026, 9, 30, 12)) {
  const raw = new Map<string, string>(); let now = initialDate;
  const storage = { getItem: (key: string) => raw.get(key) ?? null, setItem: (key: string, value: string) => { raw.set(key, value); } };
  const adapter = new LocalPersistence(storage); const store = new WorkspaceStore(adapter, () => now);
  return { raw, adapter, store, setDate: (date: Date) => { now = date; } };
}
const account = (store: WorkspaceStore, name = 'Test Account', owner = '') => store.addAccount({ name, owner, websiteUrl: '', crmUrl: '' });
test('new workspace starts empty and accepts a name-only account', () => {
  const { store } = setup(); assert.equal(store.getSnapshot().accounts.length, 0);
  const id = account(store); assert.equal(store.getSnapshot().accounts[0].id, id); assert.equal(store.getSnapshot().accounts[0].owner, '');
});
test('account edits merge with latest fields and preserve manual last worked date', () => {
  const { store } = setup(); const id = account(store);
  store.update('accounts', id, { lastWorkedDate: '2026-10-01' }); store.update('accounts', id, { companyDescription: 'Long\ncompany context' }); store.update('accounts', id, { notes: 'Recent notes' });
  const row = store.getSnapshot().accounts[0]; assert.equal(row.lastWorkedDate, '2026-10-01'); assert.equal(row.companyDescription, 'Long\ncompany context'); assert.equal(row.notes, 'Recent notes');
});
test('all record types, multiline content, order and colors persist through serialization', () => {
  const { store, adapter } = setup(); const id = account(store, 'Test Account', 'Alex');
  const contactId = store.addContact({ accountId: id, name: 'Test Contact', title: 'Director', crmUrl: '', linkedinUrl: '', lastContactedDate: '' });
  store.update('contacts', contactId, { notes: 'One\nTwo' }); store.addMessage({ accountId: id, type: 'email', status: 'current', content: 'Account\ntemplate' }); store.addMessage({ contactId, type: 'linkedin', status: 'previous', content: 'Personal\nmessage' });
  const taskId = store.addTask({ name: 'Follow up', notes: 'Context', category: 'adhoc', accountId: id }); store.toggleTask(taskId);
  assert.deepEqual(new WorkspaceStore(adapter).getSnapshot(), store.getSnapshot());
});
test('account and main task views use one stable task ID through complete/edit/reopen/delete', () => {
  const { store } = setup(); const accountId = account(store); const id = store.addTask({ name: 'Follow up', notes: '', category: 'adhoc', accountId });
  const accountTasks = () => store.getSnapshot().tasks.filter(t => t.accountId === accountId);
  assert.equal(accountTasks()[0].id, store.getSnapshot().tasks[0].id); store.toggleTask(id); assert.equal(accountTasks()[0].isCompleted, true); assert.ok(accountTasks()[0].completedAt);
  store.update('tasks', id, { notes: 'Changed from another view' }); assert.equal(accountTasks()[0].notes, 'Changed from another view');
  store.toggleTask(id); assert.equal(accountTasks()[0].completedAt, null); assert.equal(store.getSnapshot().tasks.length, 1); store.remove('tasks', id); assert.equal(accountTasks().length, 0);
});

test('optional task links persist with existing records and can be edited or cleared', () => {
  const { store, adapter } = setup();
  const legacyId = store.addTask({ name: 'Existing task', notes: 'Keep notes', category: 'weekly' });
  const linkedId = store.addTask({ name: 'Linked task', notes: '', category: 'adhoc', linkUrl: 'https://example.com/task' });
  store.toggleTask(linkedId);
  const reopened = new WorkspaceStore(adapter);
  assert.equal(reopened.getSnapshot().tasks.find(t => t.id === legacyId)?.linkUrl, undefined);
  assert.equal(reopened.getSnapshot().tasks.find(t => t.id === linkedId)?.linkUrl, 'https://example.com/task');
  reopened.update('tasks', legacyId, { linkUrl: 'https://example.com/routine' });
  reopened.update('tasks', linkedId, { linkUrl: '' });
  const saved = new WorkspaceStore(adapter).getSnapshot().tasks;
  assert.equal(saved.find(t => t.id === legacyId)?.notes, 'Keep notes');
  assert.equal(saved.find(t => t.id === legacyId)?.linkUrl, 'https://example.com/routine');
  assert.equal(saved.find(t => t.id === linkedId)?.linkUrl, '');
  assert.equal(saved.find(t => t.id === linkedId)?.isCompleted, true);
});
test('new and reopened tasks go to top; account subset follows global reorder', () => {
  const { store, adapter } = setup(); const a = account(store); const b = account(store, 'Other');
  const one = store.addTask({ name: 'One', notes: '', category: 'adhoc', accountId: a }); const middle = store.addTask({ name: 'Middle', notes: '', category: 'adhoc', accountId: b }); const two = store.addTask({ name: 'Two', notes: '', category: 'adhoc', accountId: a });
  assert.equal(orderedTasks(store.getSnapshot().tasks)[0].id, two); store.moveTask(one, two);
  assert.deepEqual(orderedTasks(store.getSnapshot().tasks.filter(t => t.accountId === a)).map(t => t.id), [one, two]);
  assert.deepEqual(orderedTasks(new WorkspaceStore(adapter).getSnapshot().tasks).map(t => t.id), [one, two, middle]);
  store.toggleTask(two); store.toggleTask(two); assert.equal(orderedTasks(store.getSnapshot().tasks)[0].id, two);
});
test('downward task reorder and unrelated categories are stable', () => {
  const { store } = setup(); const a = store.addTask({ name: 'A', notes: '', category: 'daily' }); const b = store.addTask({ name: 'B', notes: '', category: 'daily' }); const c = store.addTask({ name: 'C', notes: '', category: 'weekly' });
  store.moveTask(b, a, true); assert.deepEqual(orderedTasks(store.getSnapshot().tasks.filter(t => t.category === 'daily')).map(t => t.id), [a, b]);
  store.moveTask(b, c); assert.equal(store.getSnapshot().tasks.find(t => t.id === c)?.sortOrder, -1);
});
test('daily completion stays for the day, resets at local midnight, ad hoc stays completed', () => {
  const { store, setDate } = setup(new Date(2026, 9, 30, 0, 1));
  const daily = store.addTask({ name: 'Routine', notes: '', category: 'daily' }); const adhoc = store.addTask({ name: 'One time', notes: '', category: 'adhoc' }); store.toggleTask(daily); store.toggleTask(adhoc);
  setDate(new Date(2026, 9, 30, 23, 59)); store.refreshRecurrences(); assert.ok(store.getSnapshot().tasks.find(t => t.id === daily)?.isCompleted);
  setDate(new Date(2026, 9, 31, 0, 0)); store.refreshRecurrences(); assert.equal(store.getSnapshot().tasks.find(t => t.id === daily)?.isCompleted, false); assert.ok(store.getSnapshot().tasks.find(t => t.id === adhoc)?.isCompleted);
});
test('weekly completion persists through Sunday and resets Monday midnight', () => {
  const { store, setDate } = setup(new Date(2026, 9, 26, 9)); const id = store.addTask({ name: 'Weekly', notes: '', category: 'weekly' }); store.toggleTask(id);
  setDate(new Date(2026, 10, 1, 23, 59)); store.refreshRecurrences(); assert.ok(store.getSnapshot().tasks[0].isCompleted);
  setDate(new Date(2026, 10, 2, 0, 0)); store.refreshRecurrences(); assert.equal(store.getSnapshot().tasks[0].isCompleted, false); assert.equal(store.getSnapshot().tasks[0].completedPeriod, null);
});
test('opening after days away normalizes recurring records and persists the reset', () => {
  const { store, adapter } = setup(); const id = store.addTask({ name: 'Daily', notes: '', category: 'daily' }); store.toggleTask(id);
  const reopened = new WorkspaceStore(adapter, () => new Date(2026, 11, 1)); assert.equal(reopened.getSnapshot().tasks[0].isCompleted, false); assert.equal(adapter.read()?.tasks[0].isCompleted, false);
});
test('period keys handle month/year rollover, leap day and DST without UTC arithmetic', () => {
  assert.equal(periodFor('weekly', new Date(2027, 0, 3, 23, 59)), '2026-12-28'); assert.equal(periodFor('weekly', new Date(2027, 0, 4)), '2027-01-04');
  assert.equal(periodFor('daily', new Date(2028, 1, 29, 23, 59)), '2028-02-29'); assert.equal(periodFor('daily', new Date(2028, 2, 1)), '2028-03-01');
  assert.equal(localDate(new Date(2026, 10, 1, 23, 59)), '2026-11-01'); assert.equal(periodFor('weekly', new Date(2026, 10, 2)), '2026-11-02'); assert.equal(periodFor('weekly', new Date(2026, 2, 8, 23, 59)), '2026-03-02');
});
test('owner colors are stable, case normalized, distinct, and unassigned stays neutral', () => {
  const { store, adapter } = setup(); const id = account(store, 'One', 'Alex'); account(store, 'Two', ' alex '); account(store, 'Three', 'Sam'); account(store, 'Four');
  const colors = store.getSnapshot().ownerColors; assert.equal(Object.keys(colors).length, 2); assert.notEqual(colors.alex, colors.sam); assert.equal(colors[''], undefined);
  store.update('accounts', id, { owner: 'Sam' }); assert.equal(store.getSnapshot().ownerColors[ownerKey(store.getSnapshot().accounts.find(a => a.id === id)!.owner)], colors.sam); assert.deepEqual(new WorkspaceStore(adapter).getSnapshot().ownerColors, colors);
});
test('account and contact messages stay separate; contact removal cleans only custom messages', () => {
  const { store } = setup(); const accountId = account(store); const contactId = store.addContact({ name: 'Person', accountId, title: '', crmUrl: '', linkedinUrl: '', lastContactedDate: '' });
  store.addMessage({ accountId, type: 'call', status: 'current', content: 'General' }); store.addMessage({ contactId, type: 'email', status: 'current', content: 'Personal' });
  assert.equal(store.getSnapshot().accountMessages.length, 1); assert.equal(store.getSnapshot().contactMessages.length, 1); store.remove('contacts', contactId); assert.equal(store.getSnapshot().contactMessages.length, 0); assert.equal(store.getSnapshot().accountMessages.length, 1);
});
test('message ordering is current/type/newest and status edits immediately reorder', () => {
  const { store } = setup(); const accountId = account(store);
  for (const status of ['previous', 'current'] as const) for (const type of ['call', 'linkedin', 'email'] as const) store.addMessage({ accountId, status, type, content: `${status} ${type}` });
  assert.deepEqual(orderedMessages(store.getSnapshot().accountMessages).map(m => `${m.status}:${m.type}`), ['current:email', 'current:linkedin', 'current:call', 'previous:email', 'previous:linkedin', 'previous:call']);
  const email = orderedMessages(store.getSnapshot().accountMessages)[0]; store.update('accountMessages', email.id, { status: 'previous' }); assert.equal(orderedMessages(store.getSnapshot().accountMessages)[0].type, 'linkedin');
  const old = { ...email, id: 'old', createdAt: '2025-01-01' }; const newer = { ...email, id: 'new', createdAt: '2026-01-01' }; assert.equal(orderedMessages([old, newer] as Message[])[0].id, 'new');
});
test('account deletion removes children but retains task records, order, notes and completion', () => {
  const { store } = setup(); const id = account(store); const other = account(store, 'Other'); const c = store.addContact({ accountId: id, name: 'Person', title: '', crmUrl: '', linkedinUrl: '', lastContactedDate: '' }); store.addMessage({ contactId: c, type: 'call', status: 'current', content: 'Personal' }); store.addMessage({ accountId: id, type: 'email', status: 'current', content: 'General' });
  const taskId = store.addTask({ accountId: id, category: 'adhoc', name: 'Follow up', notes: 'Context' }); store.toggleTask(taskId); const before = store.getSnapshot().tasks[0]; store.remove('accounts', id);
  assert.equal(store.getSnapshot().accounts[0].id, other); assert.equal(store.getSnapshot().contacts.length, 0); assert.equal(store.getSnapshot().accountMessages.length, 0); assert.equal(store.getSnapshot().contactMessages.length, 0); assert.deepEqual(store.getSnapshot().tasks[0], { ...before, accountId: null });
});
test('invalid stored data is never overwritten', () => {
  const { raw, adapter } = setup(); raw.set(STORAGE_KEY, '{broken'); const store = new WorkspaceStore(adapter); account(store); store.retrySave(); assert.equal(raw.get(STORAGE_KEY), '{broken'); assert.match(store.error, /Unable to read/);
});
test('write failure keeps records in memory and retry persists them', () => {
  const { adapter } = setup(); let fail = true;
  const store = new WorkspaceStore({ read: () => null, write: data => { if (fail) throw new Error('Full'); adapter.write(data); } }); account(store); assert.equal(store.getSnapshot().accounts.length, 1); assert.match(store.error, /only in memory/); fail = false; store.retrySave(); assert.equal(store.error, ''); assert.equal(adapter.read()?.accounts.length, 1);
});
test('empty required names, missing parents and ambiguous messages are rejected', () => {
  const { store } = setup(); assert.throws(() => account(store, ' ')); assert.throws(() => store.addTask({ name: '', notes: '', category: 'adhoc' })); assert.throws(() => store.addTask({ name: 'Task', notes: '', category: 'adhoc', accountId: 'missing' })); assert.throws(() => store.addMessage({ accountId: 'a', contactId: 'c', type: 'email', status: 'current', content: 'Message' }));
});
test('unsafe URLs are rejected and schemeless website addresses normalize', () => {
  assert.equal(safeUrl('javascript:alert(1)'), undefined); assert.equal(safeUrl('data:text/html,test'), undefined); assert.equal(safeUrl('https://example.com'), 'https://example.com/'); assert.equal(safeUrl('example.com'), 'https://example.com/'); assert.equal(safeUrl(''), undefined);
});
