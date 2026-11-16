import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { supabase, cloudProject, cloudConfigurationError } from '../data/supabase';
import { CloudPersistence, SupabaseTransport } from '../data/cloud';
import type { SyncStatus } from '../data/cloud';
import { browserPersistence, setWorkspaceStore, store } from '../data/react';
import { WorkspaceStore } from '../data/store';
import { recordCount } from '../data/changes';
import type { WorkspaceData } from '../data/model';
import { Button } from './Button';
import { BrandLogo } from './BrandLogo';
import { Field } from './UI';

interface CloudContextValue { email: string; status: SyncStatus; persistence: CloudPersistence; legacy: WorkspaceData | null; importLegacy: () => void; importError: string; signOut: () => void }
const CloudContext = createContext<CloudContextValue | null>(null);

function AuthScreen({ client, initialError = '' }: { client: SupabaseClient; initialError?: string }) {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initialError);
  const [sent, setSent] = useState(false);
  return <main className="min-h-screen flex items-center justify-center p-5"><section className="panel p-6 w-full max-w-md space-y-5">
    <BrandLogo className="h-16 w-16 object-contain" />
    <div><h1 className="text-2xl font-semibold">BDR Dragon</h1><p className="muted text-sm mt-2">Sign in to access your private workspace on any device.</p></div>
    <form className="space-y-4" onSubmit={async event => {
      event.preventDefault(); setBusy(true); setError(''); setSent(false);
      try {
        const result = await client.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: `${window.location.origin}/` } });
        if (result.error) throw result.error;
        setSent(true);
      } catch (issue) { setError(issue instanceof Error ? issue.message : String(issue)); }
      finally { setBusy(false); }
    }}><Field label="Email"><input className="input" type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} /></Field>
      <Button variant="primary" type="submit" disabled={busy}>{busy ? 'Sending…' : 'Email me a sign-in link'}</Button>
    </form>
    {sent && <p role="status" className="text-sm">Check your email and open the sign-in link on this device. Use the same email on your other devices.</p>}
    {error && <p role="alert" className="text-sm danger">{error}</p>}
  </section></main>;
}

function Loading({ error, retry }: { error?: string; retry?: () => void }) {
  return <main className="p-6"><section className="panel p-5 max-w-xl space-y-3"><h1 className="text-xl font-semibold">{error ? 'Unable to open your workspace' : 'Opening your workspace…'}</h1>{error && <p role="alert" className="text-sm muted">{error}</p>}{retry && <Button onClick={retry}>Retry</Button>}</section></main>;
}

function UserWorkspace({ client, session, children }: { client: SupabaseClient; session: Session; children: ReactNode }) {
  const [runtime, setRuntime] = useState<CloudPersistence>();
  const [status, setStatus] = useState<SyncStatus>({ pending: 0, saving: false, error: '' });
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [legacy, setLegacy] = useState<WorkspaceData | null>(null);
  const [importError, setImportError] = useState('');
  const marker = `bdr-cloud-import:${cloudProject}:${session.user.id}`;

  useEffect(() => {
    let cancelled = false;
    let persistence: CloudPersistence | undefined;
    let stop = () => {};
    setError('');
    void (async () => {
      try {
        const cacheKey = `bdr-cloud:${cloudProject}:${session.user.id}`;
        const cache = CloudPersistence.readCache(localStorage, cacheKey);
        const transport = new SupabaseTransport(client, session.user.id);
        let snapshot;
        let offline = '';
        try { snapshot = await transport.load(); }
        catch (issue) {
          if (!cache) throw issue;
          snapshot = { data: cache.serverData, revision: cache.revision };
          offline = 'Offline. Your saved device copy is open; edits will sync when the connection returns.';
        }
        if (cancelled) return;
        persistence = new CloudPersistence(transport, localStorage, cacheKey, snapshot, cache?.pending ?? []);
        const nextStore = new WorkspaceStore(persistence);
        persistence.onData = nextStore.replaceFromCloud;
        persistence.onStatus = next => setStatus(next);
        setWorkspaceStore(nextStore);
        try {
          const existing = browserPersistence.read();
          if (!localStorage.getItem(marker) && existing && (recordCount(existing) || existing.sdrName)) setLegacy(existing);
        } catch (issue) { setImportError(issue instanceof Error ? issue.message : String(issue)); }
        setStatus({ pending: cache?.pending.length ?? 0, saving: false, error: offline });
        setRuntime(persistence);
        const active = persistence;
        const refresh = () => { if (!document.hidden) void active.refresh(); };
        const timer = setInterval(refresh, 20_000);
        window.addEventListener('focus', refresh); window.addEventListener('online', refresh); document.addEventListener('visibilitychange', refresh);
        const channel = client.channel(`bdr-private-${session.user.id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'bdr_workspaces', filter: `user_id=eq.${session.user.id}` }, refresh).subscribe();
        stop = () => { clearInterval(timer); window.removeEventListener('focus', refresh); window.removeEventListener('online', refresh); document.removeEventListener('visibilitychange', refresh); void client.removeChannel(channel); };
        active.start();
        if (offline) void active.refresh();
      } catch (issue) { if (!cancelled) setError(issue instanceof Error ? issue.message : String(issue)); }
    })();
    // Inline fields flush their drafts during child cleanup before the session closes.
    return () => { cancelled = true; stop(); queueMicrotask(() => persistence?.close()); };
  }, [attempt, client, session.user.id, marker]);

  if (!runtime) return <Loading error={error} retry={error ? () => setAttempt(value => value + 1) : undefined} />;
  const signOut = () => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    if (store.error) { setImportError('Please retry saving your changes before signing out.'); return; }
    void client.auth.signOut({ scope: 'local' }).then(result => { if (result.error) setImportError(result.error.message); });
  };
  const importLegacy = () => {
    if (!legacy) return;
    store.importBrowserData(legacy);
    if (store.error) { setImportError(store.error); return; }
    try { localStorage.setItem(marker, 'imported'); setLegacy(null); setImportError(''); }
    catch { setImportError('Records were queued for cloud saving. This browser could not remember the import choice.'); }
  };
  return <CloudContext.Provider value={{ email: session.user.email ?? 'Your account', status, persistence: runtime, legacy, importLegacy, importError, signOut }}>{children}</CloudContext.Provider>;
}

export function CloudStatusBar() {
  const cloud = useContext(CloudContext);
  if (!cloud) return null;
  const { status } = cloud;
  return <div className="space-y-3 mb-5">
    <div className="flex flex-wrap items-center justify-between gap-3 text-xs muted"><div className="min-w-0 break-words">{cloud.email} · {status.error ? 'Sync needs attention' : status.pending ? `Saving ${status.pending} change${status.pending === 1 ? '' : 's'}…` : 'Saved to cloud'}</div><Button className="h-8 px-2 text-xs" onClick={cloud.signOut}>Sign out</Button></div>
    {status.error && <div role="alert" className="storage-error">{status.error}<Button className="ml-3 h-8 px-2 text-xs" onClick={() => { void cloud.persistence.refresh(); }}>Retry sync</Button></div>}
    {cloud.legacy && <section className="panel p-4 space-y-3"><h2 className="font-semibold">Bring your existing records with you</h2><p className="text-sm muted">This browser has {recordCount(cloud.legacy)} saved records. Import them into your private cloud workspace to access them on your other devices. Your original browser copy will be kept; existing cloud records will be preserved.</p><div className="flex flex-wrap gap-2"><Button variant="primary" onClick={cloud.importLegacy}>Import browser records</Button><Button onClick={() => {
      const blob = new Blob([JSON.stringify(cloud.legacy, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'bdr-dragon-browser-backup.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    }}>Download backup</Button></div></section>}
    {cloud.importError && <p role="alert" className="text-sm danger">{cloud.importError}</p>}
  </div>;
}

export default function CloudGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(!supabase);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!supabase) return;
    let active = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, next) => { if (active) { setSession(next); setReady(true); } });
    void supabase.auth.getSession().then(result => { if (active) { if (result.error) setError(result.error.message); setSession(result.data.session); setReady(true); } });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);
  if (cloudConfigurationError) return <Loading error={cloudConfigurationError} />;
  if (!supabase) return children;
  if (!ready) return <Loading />;
  if (!session) return <AuthScreen client={supabase} initialError={error} />;
  return <UserWorkspace key={session.user.id} client={supabase} session={session}>{children}</UserWorkspace>;
}
