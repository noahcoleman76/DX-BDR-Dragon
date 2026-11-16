import type { SupabaseClient } from '@supabase/supabase-js';
import type { Persistence } from './store.ts';
import type { WorkspaceData } from './model.ts';
import { emptyData } from './model.ts';
import { applyChanges, hasChanges, workspaceChanges } from './changes.ts';
import type { WorkspaceChanges } from './changes.ts';

export interface PendingMutation { id: string; changes: WorkspaceChanges }
export interface CloudCache { serverData: WorkspaceData; revision: number; pending: PendingMutation[] }
export interface SyncStatus { pending: number; saving: boolean; error: string; lastSaved?: string }
export interface CloudSnapshot { data: WorkspaceData; revision: number }
export interface CloudTransport {
  load(): Promise<CloudSnapshot>;
  send(mutation: PendingMutation): Promise<CloudSnapshot>;
}

export class SupabaseTransport implements CloudTransport {
  constructor(privateClient: SupabaseClient, userId: string) { this.client = privateClient; this.userId = userId; }
  private client: SupabaseClient;
  private userId: string;
  async load() {
    const { data, error } = await this.client.from('bdr_workspaces').select('data,revision').eq('user_id', this.userId).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? { data: data.data as WorkspaceData, revision: Number(data.revision) } : { data: emptyData(), revision: 0 };
  }
  async send(mutation: PendingMutation) {
    const { data, error } = await this.client.rpc('bdr_apply_changes', { mutation_id: mutation.id, changes: mutation.changes, expected_user_id: this.userId });
    if (error) throw new Error(error.message);
    return data as CloudSnapshot;
  }
}

export class CloudPersistence implements Persistence {
  private cache: CloudCache;
  private current: WorkspaceData;
  private flushing = false;
  private closed = false;
  private error = '';
  private cacheError = '';
  private lastSaved?: string;
  private timer?: ReturnType<typeof setTimeout>;
  onData?: (data: WorkspaceData) => void;
  onStatus?: (status: SyncStatus) => void;
  private transport: CloudTransport;
  private storage: Pick<Storage, 'getItem' | 'setItem'>;
  private key: string;
  constructor(transport: CloudTransport, storage: Pick<Storage, 'getItem' | 'setItem'>, key: string, initial: CloudSnapshot, pending: PendingMutation[] = []) {
    this.transport = transport; this.storage = storage; this.key = key;
    this.cache = { serverData: initial.data, revision: initial.revision, pending };
    this.current = this.rebase(); this.persist();
  }
  static readCache(storage: Pick<Storage, 'getItem'>, key: string): CloudCache | null {
    const raw = storage.getItem(key);
    if (!raw) return null;
    const cache = JSON.parse(raw) as CloudCache;
    if (!cache.serverData || !Array.isArray(cache.pending) || typeof cache.revision !== 'number') throw new Error('Your offline records could not be read. They have been preserved.');
    return cache;
  }
  private rebase() { return this.cache.pending.reduce((data, mutation) => applyChanges(data, mutation.changes), this.cache.serverData); }
  private persist() {
    try { this.storage.setItem(this.key, JSON.stringify(this.cache)); this.cacheError = ''; }
    catch (issue) { this.cacheError = 'Device storage is unavailable. Keep this tab open until your changes are saved to cloud.'; throw issue; }
  }
  private notify() { this.onStatus?.({ pending: this.cache.pending.length, saving: this.flushing, error: this.cacheError || this.error, lastSaved: this.lastSaved }); }
  read() { return this.current; }
  write(data: WorkspaceData) {
    if (this.closed) throw new Error('Cloud session is closed.');
    const changes = workspaceChanges(this.current, data);
    if (!hasChanges(changes)) { this.persist(); queueMicrotask(() => { void this.flush(); }); return; }
    this.cache.pending = [...this.cache.pending, { id: crypto.randomUUID(), changes }];
    this.current = data;
    try { this.persist(); } catch (error) { queueMicrotask(() => { void this.flush(); }); throw error; }
    this.notify();
    // Finish the synchronous store update before a remote result can arrive.
    queueMicrotask(() => { void this.flush(); });
  }
  private accept(snapshot: CloudSnapshot) {
    if (snapshot.revision >= this.cache.revision) {
      this.cache.serverData = snapshot.data; this.cache.revision = snapshot.revision;
    }
    this.current = this.rebase(); this.persist(); this.onData?.(this.current);
  }
  async refresh() {
    if (this.closed) return;
    try {
      const snapshot = await this.transport.load();
      if (this.closed) return;
      this.accept(snapshot); this.error = ''; this.notify();
      void this.flush();
    } catch (error) {
      if (this.closed) return;
      this.error = `Cloud connection unavailable. ${error instanceof Error ? error.message : String(error)}`; this.notify();
    }
  }
  async flush() {
    if (this.closed || this.flushing) return;
    clearTimeout(this.timer); this.flushing = true; this.notify();
    try {
      while (this.cache.pending.length && !this.closed) {
        const mutation = this.cache.pending[0];
        const result = await this.transport.send(mutation);
        if (this.closed) return;
        // Keep the mutation on disk until the successful result is safely cached.
        const previous = this.cache;
        this.cache = { ...this.cache, pending: this.cache.pending.filter(row => row.id !== mutation.id) };
        try { this.accept(result); } catch (error) { this.cache = previous; this.current = this.rebase(); throw error; }
        this.error = ''; this.lastSaved = new Date().toISOString();
      }
    } catch (error) {
      if (!this.closed) {
        this.error = `Changes are saved on this device and waiting to sync. ${error instanceof Error ? error.message : String(error)}`;
        this.timer = setTimeout(() => { void this.flush(); }, 30_000);
      }
    } finally { this.flushing = false; if (!this.closed) this.notify(); }
  }
  start() { void this.flush(); }
  close() { this.closed = true; clearTimeout(this.timer); this.onData = undefined; this.onStatus = undefined; }
}
