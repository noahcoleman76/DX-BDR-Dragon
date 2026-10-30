export default function SettingsPage() {
  return <div className="space-y-4"><div className="panel p-4"><h1 className="text-xl font-semibold">Settings</h1><p className="muted text-sm mt-1">Workspace preferences</p></div>
    <div className="panel p-4"><h2 className="font-semibold">Appearance</h2><p className="muted text-sm mt-2">Use the Light / Dark control in the navigation to change your theme. Your preference is remembered on this browser.</p></div>
    <div className="panel p-4"><h2 className="font-semibold">Local workspace</h2><p className="muted text-sm mt-2">Records are saved on this browser and device. Clearing this site's browser data removes these records.</p></div>
  </div>;
}
