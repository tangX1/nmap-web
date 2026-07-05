import { NavLink } from 'react-router-dom'

const TOP_NAV = [
  { to: '/dashboard',     label: 'Dashboard' },
  { to: '/network-map',   label: 'Network Map' },
  { to: '/vulnerability', label: 'Vulnerability' },
]

export default function TopBar() {
  return (
    <header className="topbar">

      {/* Left — Brand */}
      <div className="topbar-left">
        <div className="topbar-logo">
          <svg width="22" height="22" fill="none" stroke="var(--accent-green)"
            strokeWidth="1.8" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="4" />
            <line x1="12" y1="2"  x2="12" y2="8" />
            <line x1="12" y1="16" x2="12" y2="22" />
            <line x1="2"  y1="12" x2="8"  y2="12" />
            <line x1="16" y1="12" x2="22" y2="12" />
          </svg>
          <span className="topbar-brand">NetScan</span>
        </div>
      </div>

      {/* Center — Nav */}
      <nav className="topbar-nav">
        {TOP_NAV.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              isActive ? 'topbar-link topbar-link--active' : 'topbar-link'
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Right — Status + Icons */}
      <div className="topbar-right">
        <div className="status-badge">
          <span className="status-dot" />
          READY
        </div>

        {/* Bell */}
        <button className="topbar-icon-btn" aria-label="Notifications">
          <svg width="18" height="18" fill="none" stroke="currentColor"
            strokeWidth="1.8" viewBox="0 0 24 24">
            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 01-3.46 0" />
          </svg>
        </button>

        {/* Settings */}
        <button className="topbar-icon-btn" aria-label="Settings">
          <svg width="18" height="18" fill="none" stroke="currentColor"
            strokeWidth="1.8" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
          </svg>
        </button>

        {/* User avatar */}
        <div className="topbar-avatar" aria-label="User">
          U
        </div>
      </div>

    </header>
  )
}