import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyData } from '../src/data/model.ts';
import { applyChanges, importBrowserRecords, workspaceChanges } from '../src/data/changes.ts';
import { CloudPersistence } from '../src/data/cloud.ts';
import type { CloudSnapshot, CloudTransport, PendingMutation } from '../src/data/cloud.ts';

function fixture() {
  const data = emptyData();
  data.accounts.push({ id: 'account', name: 'Acme', owner: 'Alex', notes: 'Original', createdAt: '2026-11-15', updatedAt: '2026-11-15', websiteUrl: '', crmUrl: '', companyDescription: '', lastWorkedDate: '' });
  return data;
}
class FakeCloud implements CloudTransport {
  snapshot: CloudSnapshot = { data: fixture(), revision: 1 };
  seen = new Set<string>();
  offline = false;
  dropResponse = false;
  async load() { if (this.offline) throw new Error('Offline'); return structuredClone(this.snapshot); }
  async send(mutation: PendingMutation) {
    if (this.offline) throw new Error('Offline');
    if (!this.seen.has(mutation.id)) {
      this.snapshot = { data: applyChanges(this.snapshot.data, mutation.changes), revision: this.snapshot.revision + 1 }; this.seen.add(mutation.id);
    }
    if (this.dropResponse) { this.dropResponse = false; throw new Error('Lost response'); }
    return structuredClone(this.snapshot);
  }
}
function device() {
  const raw = new Map<string, string>();
  const storage = { getItem: (key: string) => raw.get(key) ?? null, setItem: (key: string, value: string) => { raw.set(key, value); } };
  return { raw, storage };
}

test('field changes from different devices merge without replacing unrelated data', () => {
  const base = fixture(); const one = structuredClone(base); const two = structuredClone(base);
  one.accounts[0].notes = 'Edited on laptop'; two.accounts[0].owner = 'Sam';
  const merged = applyChanges(applyChanges(base, workspaceChanges(base, one)), workspaceChanges(base, two));
  assert.equal(merged.accounts[0].notes, 'Edited on laptop'); assert.equal(merged.accounts[0].owner, 'Sam');
  assert.equal(merged.accounts[0].name, 'Acme');
});

test('stale edits do not resurrect deletions and account deletion keeps tasks unassigned', () => {
  const base = fixture();
  base.contacts.push({ id: 'contact', accountId: 'account', name: 'Person', title: '', notes: '', crmUrl: '', linkedinUrl: '', lastContactedDate: '', createdAt: '2026-11-15', updatedAt: '2026-11-15' });
  base.contactMessages.push({ id: 'message', contactId: 'contact', type: 'email', status: 'current', content: 'Personal', createdAt: '2026-11-15', updatedAt: '2026-11-15' });
  base.tasks.push({ id: 'task', accountId: 'account', name: 'Follow up', notes: '', category: 'adhoc', isCompleted: false, completedAt: null, completedPeriod: null, sortOrder: 0, createdAt: '2026-11-15', updatedAt: '2026-11-15' });
  const edited = structuredClone(base); edited.contacts[0].notes = 'Stale edit';
  const deleted = applyChanges(base, { fields: {}, records: [{ collection: 'accounts', id: 'account', kind: 'delete' }] });
  const merged = applyChanges(deleted, workspaceChanges(base, edited));
  assert.equal(merged.accounts.length, 0); assert.equal(merged.contacts.length, 0); assert.equal(merged.contactMessages.length, 0); assert.equal(merged.tasks[0].accountId, null);
});

test('browser import preserves cloud edits, record IDs, relations and original browser data', () => {
  const browser = fixture(); browser.sdrName = 'Taylor'; browser.ownerColors = { alex: 'green' };
  const cloud = fixture(); cloud.accounts[0].notes = 'Cloud edit'; cloud.sdrName = 'Existing name';
  const copy = structuredClone(browser); const imported = importBrowserRecords(cloud, browser);
  assert.equal(imported.accounts.length, 1); assert.equal(imported.accounts[0].notes, 'Cloud edit'); assert.equal(imported.sdrName, 'Existing name');
  assert.deepEqual(browser, copy); assert.equal(imported.ownerColors.alex, 'green');
  const fresh = importBrowserRecords(emptyData(), browser);
  assert.deepEqual(applyChanges(emptyData(), workspaceChanges(emptyData(), fresh)), fresh);
});

test('offline edits survive reload and rebase on newer remote fields', async t => {
  const transport = new FakeCloud(); const { storage } = device();
  const first = new CloudPersistence(transport, storage, 'user-a', transport.snapshot); t.after(() => first.close());
  transport.offline = true;
  const next = structuredClone(first.read()); next.accounts[0].notes = 'Offline note';
  first.write(next); await first.flush(); first.close();
  const cache = CloudPersistence.readCache(storage, 'user-a')!; assert.equal(cache.pending.length, 1);
  transport.offline = false; transport.snapshot.data.accounts[0].owner = 'Sam'; transport.snapshot.revision++;
  const second = new CloudPersistence(transport, storage, 'user-a', await transport.load(), cache.pending); t.after(() => second.close());
  assert.equal(second.read().accounts[0].notes, 'Offline note'); assert.equal(second.read().accounts[0].owner, 'Sam');
  await second.flush(); assert.equal(transport.snapshot.data.accounts[0].notes, 'Offline note');
  assert.equal(CloudPersistence.readCache(storage, 'user-a')!.pending.length, 0);
  assert.equal(CloudPersistence.readCache(storage, 'user-b'), null);
});

test('retry after a lost acknowledgement uses the same mutation ID and keeps newer cloud edits', async t => {
  const transport = new FakeCloud(); const { storage } = device();
  const first = new CloudPersistence(transport, storage, 'user-a', transport.snapshot); t.after(() => first.close());
  transport.dropResponse = true;
  const next = structuredClone(first.read()); next.accounts[0].notes = 'First edit'; first.write(next); await first.flush(); first.close();
  transport.snapshot.data.accounts[0].notes = 'Newer edit from another device'; transport.snapshot.revision++;
  const cache = CloudPersistence.readCache(storage, 'user-a')!;
  const second = new CloudPersistence(transport, storage, 'user-a', await transport.load(), cache.pending); t.after(() => second.close());
  await second.flush(); assert.equal(transport.seen.size, 1); assert.equal(second.read().accounts[0].notes, 'Newer edit from another device');
});

test('changes made while a save is in flight are kept in the pending queue', async t => {
  const server = new FakeCloud(); const { storage } = device();
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  let firstCall = true;
  const transport: CloudTransport = { load: () => server.load(), send: async mutation => { if (firstCall) { firstCall = false; await gate; } return server.send(mutation); } };
  const cloud = new CloudPersistence(transport, storage, 'user-a', server.snapshot); t.after(() => cloud.close());
  const one = structuredClone(cloud.read()); one.accounts[0].notes = 'Note'; cloud.write(one);
  const saving = cloud.flush();
  const two = structuredClone(cloud.read()); two.accounts[0].owner = 'Sam'; cloud.write(two);
  release(); await saving;
  assert.equal(server.snapshot.data.accounts[0].notes, 'Note'); assert.equal(server.snapshot.data.accounts[0].owner, 'Sam');
  assert.equal(CloudPersistence.readCache(storage, 'user-a')!.pending.length, 0);
});

test('closing a session prevents a late response from updating the next user view', async () => {
  const server = new FakeCloud(); const { storage } = device();
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const transport: CloudTransport = { load: () => server.load(), send: async mutation => { await gate; return server.send(mutation); } };
  const cloud = new CloudPersistence(transport, storage, 'user-a', server.snapshot);
  let updates = 0; cloud.onData = () => { updates++; };
  const next = structuredClone(cloud.read()); next.sdrName = 'Taylor'; cloud.write(next);
  const saving = cloud.flush(); cloud.close(); release(); await saving;
  assert.equal(updates, 0); assert.equal(CloudPersistence.readCache(storage, 'user-a')!.pending.length, 1);
});

test('retrying a storage failure persists the pending edit instead of silently dropping it', async t => {
  const server = new FakeCloud(); const { storage } = device();
  let full = false;
  const disk = { getItem: storage.getItem, setItem: (key: string, value: string) => { if (full) throw new Error('Storage full'); storage.setItem(key, value); } };
  const cloud = new CloudPersistence(server, disk, 'user-a', server.snapshot); t.after(() => cloud.close());
  server.offline = true; full = true;
  const next = structuredClone(cloud.read()); next.sdrName = 'Saved later';
  assert.throws(() => cloud.write(next), /Storage full/); await cloud.flush();
  full = false; cloud.write(next);
  assert.equal(CloudPersistence.readCache(disk, 'user-a')!.pending.length, 1);
  server.offline = false; await cloud.flush();
  assert.equal(server.snapshot.data.sdrName, 'Saved later');
});
