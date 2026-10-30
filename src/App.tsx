import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import { store, useWorkspace } from './data/react';
import TasksPage from './pages/TasksPage';
import AccountsPage from './pages/AccountsPage';
import SettingsPage from './pages/SettingsPage';

function Workspace() {
  useWorkspace();
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const refresh = () => {
      store.refreshRecurrences(); clearTimeout(timer);
      const now = new Date(); const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      timer = setTimeout(refresh, Math.min(midnight.getTime() - now.getTime() + 50, 60_000));
    };
    refresh(); window.addEventListener('focus', refresh); document.addEventListener('visibilitychange', refresh);
    return () => { clearTimeout(timer); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); };
  }, []);
  return <Layout>{store.error && <div role="alert" className="storage-error mb-4">{store.error}<button className="btn ml-3" onClick={store.retrySave}>Retry saving</button></div>}<Routes>
    <Route path="/" element={<div className="panel p-4"><h1 className="text-xl font-semibold">Home</h1><p className="muted text-sm mt-1">Your BDR workspace.</p></div>} />
    <Route path="/tasks" element={<TasksPage />} /><Route path="/accounts" element={<AccountsPage />} />
    <Route path="/settings" element={<SettingsPage />} /><Route path="*" element={<Navigate to="/" replace />} />
  </Routes></Layout>;
}
export default function App() { return <BrowserRouter><Workspace /></BrowserRouter>; }
