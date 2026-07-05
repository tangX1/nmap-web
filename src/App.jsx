import { Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/Layout/Sidebar'
import TopBar from './components/Layout/TopBar'
import DashboardPage from './pages/DashboardPage'
import SettingsPage from './pages/SettingsPage'
import LogsPage from './pages/LogsPage'
import NetworkMapPage from './pages/NetworkMapPage'
import VulnerabilityPage from './pages/VulnerabilityPage'
import "./index.css"

export default function App() {
  return (
    <div className="app-wrapper">
      <Sidebar />
      <div className="app-body">
        <TopBar />
        <main className="app-main">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" />} />
            <Route path="/dashboard"     element={<DashboardPage />} />
            <Route path="/network-map"   element={<NetworkMapPage />} />
            <Route path="/vulnerability" element={<VulnerabilityPage />} />
            <Route path="/logs"          element={<LogsPage />} />
            <Route path="/settings"      element={<SettingsPage />} />
          </Routes>
        </main>
      </div>
    </div>
  )
};
