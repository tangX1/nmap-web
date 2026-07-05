import { NavLink } from "react-router-dom";
import {
  LayoutGrid,
  Share2,
  Shield,
  TerminalSquare,
  Settings,
  Plus,
  HelpCircle,
  FileText,
} from "lucide-react";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutGrid, end: true },
  { to: "/network-map", label: "Network Map", icon: Share2 },
  { to: "/vulnerability", label: "Vulnerability", icon: Shield },
  { to: "/logs", label: "Logs", icon: TerminalSquare },
  { to: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <h2 className="sidebar__title">Terminal Console</h2>
        <span className="sidebar__version">v4.2.0-stable</span>
      </div>

      <nav className="sidebar__nav">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `sidebar__link${isActive ? " sidebar__link--active" : ""}`
            }
          >
            <Icon size={18} strokeWidth={2} className="sidebar__icon" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar__footer">
        <button type="button" className="sidebar__discovery">
          <Plus size={18} strokeWidth={2.5} />
          <span>New Discovery</span>
        </button>

        <div className="sidebar__meta">
          <a href="#support" className="sidebar__meta-link">
            <HelpCircle size={16} strokeWidth={2} />
            <span>Support</span>
          </a>
          <a href="#docs" className="sidebar__meta-link">
            <FileText size={16} strokeWidth={2} />
            <span>Documentation</span>
          </a>
        </div>
      </div>
    </aside>
  );
}