import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../../lib/api'
import { getStatusConfig, getIncidentStatusConfig, formatRelativeTime } from '../../lib/utils'

export default function AdminDashboard() {
  const [systemStatus, setSystemStatus] = useState(null)
  const [services, setServices] = useState([])
  const [activeIncidents, setActiveIncidents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [statusRes, servicesRes, incidentsRes] = await Promise.all([
        api.getSystemStatus(),
        api.getServices(),
        api.getActiveIncidents()
      ])
      setSystemStatus(statusRes)
      setServices(servicesRes)
      setActiveIncidents(incidentsRes)
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleQuickStatusChange = async (serviceId, newStatus) => {
    try {
      await api.updateServiceStatus(serviceId, newStatus)
      fetchData()
    } catch (error) {
      console.error('Failed to update status:', error)
    }
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    )
  }

  const statusConfig = systemStatus ? getStatusConfig(systemStatus.status) : null

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-slate-400 mt-1">Overview of your system status</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Overall Status */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-slate-400 text-sm font-medium">Overall Status</span>
            <span className={`w-3 h-3 rounded-full ${statusConfig?.bgColor}`}></span>
          </div>
          <p className={`text-2xl font-bold ${statusConfig?.textColor}`}>
            {statusConfig?.label || 'Unknown'}
          </p>
        </div>

        {/* Total Services */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-slate-400 text-sm font-medium">Total Services</span>
            <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
            </svg>
          </div>
          <p className="text-2xl font-bold text-white">{systemStatus?.total_services || 0}</p>
        </div>

        {/* Operational */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-slate-400 text-sm font-medium">Operational</span>
            <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
          </div>
          <p className="text-2xl font-bold text-emerald-400">
            {systemStatus?.services?.operational || 0}
          </p>
        </div>

        {/* Active Incidents */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-slate-400 text-sm font-medium">Active Incidents</span>
            <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-2xl font-bold text-white">{systemStatus?.active_incidents || 0}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Active Incidents */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
            <h2 className="font-semibold text-white">Active Incidents</h2>
            <Link to="/admin/incidents" className="text-sm text-indigo-400 hover:text-indigo-300">
              View all →
            </Link>
          </div>
          <div className="divide-y divide-slate-800">
            {activeIncidents.length === 0 ? (
              <div className="px-6 py-8 text-center">
                <div className="text-3xl mb-2">✓</div>
                <p className="text-slate-400">No active incidents</p>
              </div>
            ) : (
              activeIncidents.slice(0, 3).map((incident) => {
                const incidentStatusConfig = getIncidentStatusConfig(incident.status)
                return (
                  <div key={incident.id} className="px-6 py-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium text-white">{incident.title}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${incidentStatusConfig.bgClass} ${incidentStatusConfig.textClass}`}>
                            {incidentStatusConfig.label}
                          </span>
                          <span className="text-slate-500 text-sm">
                            {formatRelativeTime(incident.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Services Quick Status */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
            <h2 className="font-semibold text-white">Services</h2>
            <Link to="/admin/services" className="text-sm text-indigo-400 hover:text-indigo-300">
              Manage →
            </Link>
          </div>
          <div className="divide-y divide-slate-800 max-h-96 overflow-y-auto">
            {services.map((service) => {
              const serviceStatusConfig = getStatusConfig(service.status)
              return (
                <div key={service.id} className="px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full ${serviceStatusConfig.bgColor}`}></span>
                    <span className="text-white font-medium">{service.name}</span>
                  </div>
                  <select
                    value={service.status}
                    onChange={(e) => handleQuickStatusChange(service.id, e.target.value)}
                    className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="operational">Operational</option>
                    <option value="degraded">Degraded</option>
                    <option value="partial_outage">Partial Outage</option>
                    <option value="major_outage">Major Outage</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

