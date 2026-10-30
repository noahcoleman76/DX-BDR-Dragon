import { PageHeader } from "../components/PageHeader";
import { accentGroups, accentOptions, useTheme } from "../context/ThemeContext";

export default function SettingsPage() {
  const { accent, setAccent, mode } = useTheme();
  return (
    <>
      <PageHeader title="Settings" description="Account settings." />
      <section className="mb-5 max-w-5xl rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-700">Appearance</h2>
        <p className="mt-1 text-sm text-slate-500">Click the logo to switch between light and dark mode. Current mode: {mode}.</p>
        <div className="mt-5 space-y-6">
          {accentGroups.map((group) => (
            <div key={group.key}>
              <div className="mb-2 flex items-baseline gap-2">
                <h3 className="text-sm font-semibold text-slate-800">{group.label}</h3>
                <span className="text-xs text-slate-500">{group.description}</span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {accentOptions.filter((option) => option.group === group.key).map((option) => (
                  <button
                    key={option.key}
                    className={`focus-ring flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition ${accent === option.key ? "border-slate-950 bg-slate-50" : "border-slate-200 bg-white hover:bg-slate-50"}`}
                    onClick={() => setAccent(option.key)}
                    type="button"
                  >
                    <span className="h-5 w-5 rounded-full shadow-sm" style={{ background: `linear-gradient(135deg, ${option.glow ?? option.color}, ${option.soft})` }} />
                    <span>{option.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
