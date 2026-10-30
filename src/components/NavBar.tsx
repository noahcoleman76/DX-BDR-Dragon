import { NavLink } from 'react-router-dom';
import DarkModeToggle from './DarkModeToggle';

export default function NavBar() {
  return <nav className="flex items-center justify-between px-4 py-2 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
    <div className="flex items-center gap-4 nav-content"><span className="font-bold text-lg whitespace-nowrap">BDR Dragon</span><div className="flex gap-1 text-sm main-links">
      {[["/", "Home"], ["/tasks", "Tasks"], ["/accounts", "Accounts"], ["/settings", "Settings"]].map(([to, label]) => <NavLink key={to} end={to === '/'} to={to} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>{label}</NavLink>)}
    </div></div><DarkModeToggle />
  </nav>;
}
