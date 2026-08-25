import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Sidebar from './components/Layout/Sidebar'
import TopBar from './components/Layout/TopBar'
import ErrorBoundary from './components/Layout/ErrorBoundary'
import DashboardPage from './pages/DashboardPage'
import SettingsPage from './pages/SettingsPage'
import LogsPage from './pages/LogsPage'
import NetworkMapPage from './pages/NetworkMapPage'
import VulnerabilityPage from './pages/VulnerabilityPage'


export default function App() {
  const { pathname } = useLocation()

  return (
    <div className="app-wrapper">
      <Sidebar />
      <div className="app-body">
        <TopBar />
        <main className="app-main">
          {/* Keyed by route so a page that throws doesn't keep every later
              navigation stuck on the fallback. */}
          <ErrorBoundary key={pathname}>
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" />} />
              <Route path="/dashboard"     element={<DashboardPage />} />
              <Route path="/network-map"   element={<NetworkMapPage />} />
              <Route path="/vulnerability" element={<VulnerabilityPage />} />
              <Route path="/logs"          element={<LogsPage />} />
              <Route path="/settings"      element={<SettingsPage />} />
            </Routes>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  )
};
