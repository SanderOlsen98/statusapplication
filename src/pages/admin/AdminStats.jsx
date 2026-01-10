import { useState, useEffect } from 'react'
import api from '../../lib/api'
import { getIncidentStatusConfig, getImpactConfig, formatDateTime, formatDate } from '../../lib/utils'

export default function AdminStats() {
  const [incidents, setIncidents] = useState([])
  const [maintenance, setMaintenance] = useState([])
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('incidents')
  const [timeRange, setTimeRange] = useState('30')
  const [selectedIncident, setSelectedIncident] = useState(null)

  useEffect(() => {
    fetchData()
  }, [timeRange])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [incidentsRes, servicesRes] = await Promise.all([
        api.getIncidentHistory(parseInt(timeRange)),
        api.getServices()
      ])
      
      // Separate incidents and maintenance
      const allIncidents = incidentsRes.filter(i => !i.is_scheduled)
      const allMaintenance = incidentsRes.filter(i => i.is_scheduled)
      
      setIncidents(allIncidents)
      setMaintenance(allMaintenance)
      setServices(servicesRes)
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    } finally {
      setLoading(false)
    }
  }

  // Calculate statistics
  const stats = {
    totalIncidents: incidents.length,
    resolvedIncidents: incidents.filter(i => i.status === 'resolved').length,
    avgResolutionTime: calculateAvgResolutionTime(incidents),
    totalMaintenance: maintenance.length,
    completedMaintenance: maintenance.filter(m => m.status === 'resolved').length,
    incidentsByImpact: {
      critical: incidents.filter(i => i.impact === 'critical').length,
      major: incidents.filter(i => i.impact === 'major').length,
      minor: incidents.filter(i => i.impact === 'minor').length,
      none: incidents.filter(i => i.impact === 'none').length,
    },
    incidentsByService: calculateIncidentsByService(incidents, services),
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Statistics</h1>
          <p className="text-slate-400 mt-1">Historical data and analytics</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-slate-400 text-sm">Time range:</span>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="180">Last 6 months</option>
            <option value="365">Last year</option>
          </select>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          label="Total Incidents"
          value={stats.totalIncidents}
          icon="🔴"
          subtext={`${stats.resolvedIncidents} resolved`}
        />
        <StatCard
          label="Avg Resolution Time"
          value={stats.avgResolutionTime}
          icon="⏱️"
          subtext="hours to resolve"
          isTime
        />
        <StatCard
          label="Scheduled Maintenance"
          value={stats.totalMaintenance}
          icon="🔧"
          subtext={`${stats.completedMaintenance} completed`}
        />
        <StatCard
          label="Critical Incidents"
          value={stats.incidentsByImpact.critical}
          icon="🚨"
          color="red"
          subtext={`${stats.incidentsByImpact.major} major, ${stats.incidentsByImpact.minor} minor`}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Incidents by Impact */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h3 className="font-semibold text-white mb-4">Incidents by Impact</h3>
          <div className="space-y-3">
            <ImpactBar label="Critical" count={stats.incidentsByImpact.critical} total={stats.totalIncidents} color="bg-red-500" />
            <ImpactBar label="Major" count={stats.incidentsByImpact.major} total={stats.totalIncidents} color="bg-orange-500" />
            <ImpactBar label="Minor" count={stats.incidentsByImpact.minor} total={stats.totalIncidents} color="bg-amber-500" />
            <ImpactBar label="None" count={stats.incidentsByImpact.none} total={stats.totalIncidents} color="bg-slate-500" />
          </div>
        </div>

        {/* Most Affected Services */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h3 className="font-semibold text-white mb-4">Most Affected Services</h3>
          {stats.incidentsByService.length > 0 ? (
            <div className="space-y-3">
              {stats.incidentsByService.slice(0, 5).map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <span className="text-slate-300">{item.name}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-indigo-500 rounded-full"
                        style={{ width: `${(item.count / stats.incidentsByService[0].count) * 100}%` }}
                      />
                    </div>
                    <span className="text-slate-400 text-sm w-8 text-right">{item.count}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-center py-4">No incidents with affected services</p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('incidents')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'incidents'
              ? 'bg-indigo-600 text-white'
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
          }`}
        >
          Incidents ({incidents.length})
        </button>
        <button
          onClick={() => setActiveTab('maintenance')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'maintenance'
              ? 'bg-indigo-600 text-white'
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
          }`}
        >
          Scheduled Maintenance ({maintenance.length})
        </button>
      </div>

      {/* Data Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-800 text-left">
              <th className="px-6 py-4 text-sm font-medium text-slate-400">Title</th>
              <th className="px-6 py-4 text-sm font-medium text-slate-400">Status</th>
              <th className="px-6 py-4 text-sm font-medium text-slate-400">Impact</th>
              <th className="px-6 py-4 text-sm font-medium text-slate-400">Created</th>
              <th className="px-6 py-4 text-sm font-medium text-slate-400">
                {activeTab === 'incidents' ? 'Resolved' : 'Scheduled'}
              </th>
              <th className="px-6 py-4 text-sm font-medium text-slate-400">Duration</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {(activeTab === 'incidents' ? incidents : maintenance).length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                  No {activeTab === 'incidents' ? 'incidents' : 'maintenance'} in this time period
                </td>
              </tr>
            ) : (
              (activeTab === 'incidents' ? incidents : maintenance).map((item) => {
                const statusConfig = getIncidentStatusConfig(item.status)
                const impactConfig = getImpactConfig(item.impact)
                const duration = calculateDuration(item)
                
                return (
                  <tr 
                    key={item.id} 
                    className="hover:bg-slate-800/50 cursor-pointer transition-colors"
                    onClick={() => setSelectedIncident(item)}
                  >
                    <td className="px-6 py-4">
                      <div className="font-medium text-white">{item.title}</div>
                      {item.affected_services && item.affected_services.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {item.affected_services.slice(0, 3).map((s) => (
                            <span key={s.id} className="text-xs text-slate-500">
                              {s.name}{item.affected_services.indexOf(s) < Math.min(2, item.affected_services.length - 1) ? ',' : ''}
                            </span>
                          ))}
                          {item.affected_services.length > 3 && (
                            <span className="text-xs text-slate-600">+{item.affected_services.length - 3} more</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusConfig.bgClass} ${statusConfig.textClass}`}>
                        {statusConfig.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-sm text-${impactConfig.color}-400`}>
                        {impactConfig.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-400">
                      {formatDate(item.created_at)}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-400">
                      {activeTab === 'incidents' 
                        ? (item.resolved_at ? formatDate(item.resolved_at) : '—')
                        : (item.scheduled_for ? formatDate(item.scheduled_for) : '—')
                      }
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-400 font-mono">
                      {duration || '—'}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Incident Detail Modal */}
      {selectedIncident && (
        <IncidentDetailModal 
          incident={selectedIncident} 
          onClose={() => setSelectedIncident(null)} 
        />
      )}
    </div>
  )
}

function StatCard({ label, value, icon, subtext, color = 'indigo', isTime = false }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-3">
        <span className="text-slate-400 text-sm font-medium">{label}</span>
        <span className="text-xl">{icon}</span>
      </div>
      <p className={`text-3xl font-bold ${color === 'red' ? 'text-red-400' : 'text-white'}`}>
        {isTime ? (value === 'N/A' ? value : value) : value}
      </p>
      <p className="text-slate-500 text-sm mt-1">{subtext}</p>
    </div>
  )
}

function ImpactBar({ label, count, total, color }) {
  const percentage = total > 0 ? (count / total) * 100 : 0
  
  return (
    <div className="flex items-center gap-4">
      <span className="w-16 text-sm text-slate-400">{label}</span>
      <div className="flex-1 h-6 bg-slate-800 rounded-full overflow-hidden">
        <div 
          className={`h-full ${color} rounded-full transition-all duration-500 flex items-center justify-end pr-2`}
          style={{ width: `${Math.max(percentage, count > 0 ? 10 : 0)}%` }}
        >
          {count > 0 && (
            <span className="text-xs font-medium text-white">{count}</span>
          )}
        </div>
      </div>
      <span className="w-12 text-right text-sm text-slate-500">
        {percentage.toFixed(0)}%
      </span>
    </div>
  )
}

function IncidentDetailModal({ incident, onClose }) {
  const [details, setDetails] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDetails()
  }, [incident.id])

  const fetchDetails = async () => {
    try {
      const data = await api.getIncident(incident.id)
      setDetails(data)
    } catch (error) {
      console.error('Failed to fetch incident details:', error)
    } finally {
      setLoading(false)
    }
  }

  const statusConfig = getIncidentStatusConfig(incident.status)
  const impactConfig = getImpactConfig(incident.impact)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Incident Details</h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              {incident.is_scheduled && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-500/20 text-indigo-400">
                  Scheduled
                </span>
              )}
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig.bgClass} ${statusConfig.textClass}`}>
                {statusConfig.label}
              </span>
              <span className={`text-sm text-${impactConfig.color}-400`}>
                {impactConfig.label} Impact
              </span>
            </div>
            <h3 className="text-xl font-semibold text-white">{incident.title}</h3>
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-slate-800/50 rounded-lg">
            <div>
              <span className="text-slate-500 text-sm">Created</span>
              <p className="text-white">{formatDateTime(incident.created_at)}</p>
            </div>
            <div>
              <span className="text-slate-500 text-sm">Resolved</span>
              <p className="text-white">{incident.resolved_at ? formatDateTime(incident.resolved_at) : 'Not resolved'}</p>
            </div>
            {incident.is_scheduled && (
              <>
                <div>
                  <span className="text-slate-500 text-sm">Scheduled Start</span>
                  <p className="text-white">{incident.scheduled_for ? formatDateTime(incident.scheduled_for) : '—'}</p>
                </div>
                <div>
                  <span className="text-slate-500 text-sm">Scheduled End</span>
                  <p className="text-white">{incident.scheduled_until ? formatDateTime(incident.scheduled_until) : '—'}</p>
                </div>
              </>
            )}
            <div>
              <span className="text-slate-500 text-sm">Duration</span>
              <p className="text-white font-mono">{calculateDuration(incident) || 'Ongoing'}</p>
            </div>
          </div>

          {/* Affected Services */}
          {incident.affected_services && incident.affected_services.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-slate-400 mb-2">Affected Services</h4>
              <div className="flex flex-wrap gap-2">
                {incident.affected_services.map((service) => (
                  <span
                    key={service.id}
                    className="px-3 py-1 bg-slate-800 rounded-lg text-sm text-slate-300"
                  >
                    {service.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Updates Timeline */}
          <div>
            <h4 className="text-sm font-medium text-slate-400 mb-4">Updates Timeline</h4>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
              </div>
            ) : details?.updates && details.updates.length > 0 ? (
              <div className="border-l-2 border-slate-700 pl-4 space-y-4">
                {details.updates.map((update) => {
                  const updateStatusConfig = getIncidentStatusConfig(update.status)
                  return (
                    <div key={update.id} className="relative">
                      <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-slate-600 border-2 border-slate-700"></div>
                      <div className="text-sm">
                        <div className="flex items-center gap-2 text-slate-400 mb-1">
                          <span className={`font-medium ${updateStatusConfig.textClass}`}>
                            {updateStatusConfig.label}
                          </span>
                          <span>•</span>
                          <span>{formatDateTime(update.created_at)}</span>
                        </div>
                        <p className="text-slate-300">{update.message}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-slate-500 text-center py-4">No updates recorded</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Helper functions
function calculateAvgResolutionTime(incidents) {
  const resolved = incidents.filter(i => i.resolved_at)
  if (resolved.length === 0) return 'N/A'
  
  const totalHours = resolved.reduce((sum, incident) => {
    const created = new Date(incident.created_at)
    const resolved = new Date(incident.resolved_at)
    const hours = (resolved - created) / (1000 * 60 * 60)
    return sum + hours
  }, 0)
  
  const avg = totalHours / resolved.length
  if (avg < 1) return `${Math.round(avg * 60)}m`
  if (avg < 24) return `${avg.toFixed(1)}h`
  return `${(avg / 24).toFixed(1)}d`
}

function calculateDuration(incident) {
  if (!incident.resolved_at && !incident.scheduled_until) return null
  
  const start = new Date(incident.is_scheduled && incident.scheduled_for 
    ? incident.scheduled_for 
    : incident.created_at)
  const end = new Date(incident.resolved_at || incident.scheduled_until || new Date())
  
  const diffMs = end - start
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)
  
  if (diffDays > 0) return `${diffDays}d ${diffHours % 24}h`
  if (diffHours > 0) return `${diffHours}h ${diffMins % 60}m`
  return `${diffMins}m`
}

function calculateIncidentsByService(incidents, services) {
  const counts = {}
  
  incidents.forEach(incident => {
    if (incident.affected_services) {
      incident.affected_services.forEach(service => {
        counts[service.name] = (counts[service.name] || 0) + 1
      })
    }
  })
  
  return Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
}

