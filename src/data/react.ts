import { useSyncExternalStore } from 'react';
import { LocalPersistence, WorkspaceStore } from './store';
export const store = new WorkspaceStore(new LocalPersistence({ getItem: key => window.localStorage.getItem(key), setItem: (key, value) => window.localStorage.setItem(key, value) }));
export function useWorkspace() { return useSyncExternalStore(store.subscribe, store.getSnapshot); }
