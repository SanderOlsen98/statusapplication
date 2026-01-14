import { Routes, Route } from 'react-router-dom'
import StatusPage from './pages/StatusPage'
import IncidentHistoryPage from './pages/IncidentHistoryPage'
import MaintenanceHistoryPage from './pages/MaintenanceHistoryPage'
import AdminLogin from './pages/admin/AdminLogin'
import AdminLayout from './components/admin/AdminLayout'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminServices from './pages/admin/AdminServices'
import AdminIncidents from './pages/admin/AdminIncidents'
import AdminMaintenance from './pages/admin/AdminMaintenance'
import AdminTemplates from './pages/admin/AdminTemplates'
import AdminMetrics from './pages/admin/AdminMetrics'
import AdminSubscribers from './pages/admin/AdminSubscribers'
import AdminStats from './pages/admin/AdminStats'
import AdminSettings from './pages/admin/AdminSettings'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  return (
    <Routes>
      {/* Public Status Page */}
      <Route path="/" element={<StatusPage />} />
      <Route path="/history/incidents" element={<IncidentHistoryPage />} />
      <Route path="/history/maintenance" element={<MaintenanceHistoryPage />} />
      
      {/* Admin Routes */}
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="services" element={<AdminServices />} />
        <Route path="incidents" element={<AdminIncidents />} />
        <Route path="templates" element={<AdminTemplates />} />
        <Route path="maintenance" element={<AdminMaintenance />} />
        <Route path="metrics" element={<AdminMetrics />} />
        <Route path="subscribers" element={<AdminSubscribers />} />
        <Route path="stats" element={<AdminStats />} />
        <Route path="settings" element={<AdminSettings />} />
      </Route>
    </Routes>
  )
}

export default App
