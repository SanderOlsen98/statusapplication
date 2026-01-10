import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../lib/api'
import { getStatusConfig, getIncidentStatusConfig, formatDateTime, formatRelativeTime, getUptimeColor } from '../lib/utils'
import StatusHeader from '../components/status/StatusHeader'
import ServiceGroup from '../components/status/ServiceGroup'
import ActiveIncidents from '../components/status/ActiveIncidents'
import ScheduledMaintenance from '../components/status/ScheduledMaintenance'
import IncidentHistory from '../components/status/IncidentHistory'
import MaintenanceHistory from '../components/status/MaintenanceHistory'
import Footer from '../components/status/Footer'

export default function StatusPage() {
  const [systemStatus, setSystemStatus] = useState(null)
  const [serviceGroups, setServiceGroups] = useState([])
  const [activeIncidents, setActiveIncidents] = useState([])
  const [scheduledMaintenance, setScheduledMaintenance] = useState([])
  const [incidentHistory, setIncidentHistory] = useState([])
  const [maintenanceHistory, setMaintenanceHistory] = useState([])
  const [settings, setSettings] = useState({})
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(new Date())

  useEffect(() => {
    fetchData()
    // Refresh every 60 seconds
    const interval = setInterval(fetchData, 60000)
    return () => clearInterval(interval)
  }, [])

  const fetchData = async () => {
    try {
      const [statusRes, groupsRes, activeRes, scheduledRes, historyRes, settingsRes] = await Promise.all([
        api.getSystemStatus(),
        api.getServiceGroups(),
        api.getActiveIncidents(),
        api.getScheduledMaintenance(),
        api.getIncidentHistory(14),
        api.getSettings()
      ])
      
      // Separate incidents from maintenance in history
      const incidents = historyRes.filter(item => !item.is_scheduled)
      const maintenance = historyRes.filter(item => item.is_scheduled)
      
      setSystemStatus(statusRes)
      setServiceGroups(groupsRes)
      setActiveIncidents(activeRes)
      setScheduledMaintenance(scheduledRes)
      setIncidentHistory(incidents)
      setMaintenanceHistory(maintenance)
      setSettings(settingsRes)
      setLastUpdated(new Date())
    } catch (error) {
      console.error('Failed to fetch status data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-emerald-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading status...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Background gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 pointer-events-none" />
      <div className="fixed inset-0 opacity-30 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <StatusHeader 
          siteName={settings.site_name || 'System Status'}
          systemStatus={systemStatus}
          lastUpdated={lastUpdated}
        />

        <main className="max-w-4xl mx-auto px-4 pb-16">
          {/* Active Incidents */}
          {activeIncidents.length > 0 && (
            <ActiveIncidents incidents={activeIncidents} />
          )}

          {/* Scheduled Maintenance */}
          {scheduledMaintenance.length > 0 && (
            <ScheduledMaintenance maintenance={scheduledMaintenance} />
          )}

          {/* Services */}
          <section className="mb-12">
            <h2 className="text-lg font-semibold text-slate-300 mb-6 flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
              Current Status
            </h2>
            <div className="space-y-6">
              {serviceGroups.map((group, index) => (
                <ServiceGroup 
                  key={group.id || `group-${index}`} 
                  group={group} 
                  animationDelay={index * 100}
                />
              ))}
            </div>
          </section>

          {/* Incident History */}
          <IncidentHistory incidents={incidentHistory} />

          {/* Maintenance History */}
          <MaintenanceHistory maintenance={maintenanceHistory} />
        </main>

        {/* Footer */}
        <Footer siteName={settings.site_name || 'Staytus'} />
      </div>
    </div>
  )
}

