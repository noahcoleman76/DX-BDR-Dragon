import type { WorkspaceData } from './model.ts';

export const collections = ['accounts', 'contacts', 'accountMessages', 'contactMessages', 'tasks'] as const;
type Collection = typeof collections[number];
type JsonRecord = Record<string, unknown>;
export interface RecordChange { collection: Collection; id: string; kind: 'upsert' | 'delete'; patch?: JsonRecord }
export interface WorkspaceChanges { fields: { sdrName?: string; ownerColors?: Record<string, string> }; records: RecordChange[] }
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export function workspaceChanges(previous: WorkspaceData, next: WorkspaceData): WorkspaceChanges {
  const changes: WorkspaceChanges = { fields: {}, records: [] };
  if (previous.sdrName !== next.sdrName && next.sdrName !== undefined) changes.fields.sdrName = next.sdrName;
  const colors = Object.fromEntries(Object.entries(next.ownerColors).filter(([key, value]) => previous.ownerColors[key] !== value));
  if (Object.keys(colors).length) changes.fields.ownerColors = colors;
  for (const collection of collections) {
    const before = new Map(previous[collection].map(row => [row.id, row]));
    const after = new Map(next[collection].map(row => [row.id, row]));
    for (const row of previous[collection]) if (!after.has(row.id)) changes.records.push({ collection, id: row.id, kind: 'delete' });
    for (const row of [...next[collection]].reverse()) {
      const old = before.get(row.id) as unknown as JsonRecord | undefined;
      const patch = Object.fromEntries(Object.entries(row).filter(([key, value]) => !old || !same(old[key], value)));
      if (Object.keys(patch).length) changes.records.push({ collection, id: row.id, kind: 'upsert', patch });
    }
  }
  return changes;
}
export const hasChanges = (changes: WorkspaceChanges) => changes.records.length > 0 || Object.keys(changes.fields).length > 0;

export function applyChanges(data: WorkspaceData, changes: WorkspaceChanges): WorkspaceData {
  const next = structuredClone(data);
  if (changes.fields.sdrName !== undefined) next.sdrName = changes.fields.sdrName;
  Object.assign(next.ownerColors, changes.fields.ownerColors);
  for (const change of changes.records) {
    if (change.kind === 'delete') {
      if (change.collection === 'accounts') {
        const removed = new Set(next.contacts.filter(row => row.accountId === change.id).map(row => row.id));
        next.contacts = next.contacts.filter(row => row.accountId !== change.id);
        next.contactMessages = next.contactMessages.filter(row => !removed.has(row.contactId ?? ''));
        next.accountMessages = next.accountMessages.filter(row => row.accountId !== change.id);
        next.tasks = next.tasks.map(row => row.accountId === change.id ? { ...row, accountId: null } : row);
      } else if (change.collection === 'contacts') next.contactMessages = next.contactMessages.filter(row => row.contactId !== change.id);
      const rows = next[change.collection] as unknown as JsonRecord[];
      rows.splice(0, rows.length, ...rows.filter(row => row.id !== change.id));
    } else {
      const rows = next[change.collection] as unknown as JsonRecord[];
      const index = rows.findIndex(row => row.id === change.id);
      // A pending edit must not recreate a record deleted on another device.
      if (index < 0 && !change.patch?.createdAt) continue;
      const row: JsonRecord = { ...rows[index], ...change.patch, id: change.id };
      if (change.collection === 'tasks' && row.accountId && !next.accounts.some(account => account.id === row.accountId)) row.accountId = null;
      if (index < 0) rows.unshift(row); else rows[index] = row;
    }
  }
  return next;
}

export function importBrowserRecords(cloud: WorkspaceData, browser: WorkspaceData): WorkspaceData {
  const merged = structuredClone(cloud);
  for (const collection of collections) {
    const rows = merged[collection] as unknown as JsonRecord[];
    const ids = new Set(rows.map(row => row.id));
    rows.push(...structuredClone(browser[collection]).filter(row => !ids.has(row.id)) as unknown as JsonRecord[]);
  }
  merged.ownerColors = { ...browser.ownerColors, ...cloud.ownerColors };
  merged.sdrName = cloud.sdrName || browser.sdrName;
  return merged;
}

export function recordCount(data: WorkspaceData) { return collections.reduce((count, key) => count + data[key].length, 0); }
