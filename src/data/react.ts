import { useSyncExternalStore } from 'react';
import { LocalPersistence, WorkspaceStore } from './store';
export const browserPersistence = new LocalPersistence({ getItem: key => window.localStorage.getItem(key), setItem: (key, value) => window.localStorage.setItem(key, value) });
export let store = new WorkspaceStore(browserPersistence);
export function setWorkspaceStore(next: WorkspaceStore) { store = next; }
export function useWorkspace() { return useSyncExternalStore(store.subscribe, store.getSnapshot); }
