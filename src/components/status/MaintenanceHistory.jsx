import { useState, useEffect } from 'react'
import api from '../../lib/api'
import { getIncidentStatusConfig, formatDate, formatDateTime } from '../../lib/utils'

export default function MaintenanceHistory({ maintenance }) {
  const [expandedItem, setExpandedItem] = useState(null)

  // Group maintenance by date
  const groupedMaintenance = maintenance.reduce((groups, item) => {
    const date = new Date(item.scheduled_for || item.created_at).toDateString()
    if (!groups[date]) groups[date] = []
    groups[date].push(item)
    return groups
  }, {})

  const dates = Object.keys(groupedMaintenance)

  if (dates.length === 0) {
    return null // Don't show section if no maintenance history
  }

  return (
    <section className="animate-slide-up mt-12">
      <h2 className="text-lg font-semibold text-slate-300 mb-6 flex items-center gap-2">
        <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
        Past Maintenance
      </h2>
      <div className="space-y-6">
        {dates.map((date) => (
          <div key={date} className="glass rounded-xl overflow-hidden">
            {/* Date Header */}
            <div className="px-5 py-3 bg-indigo-900/20 border-b border-white/5">
              <span className="text-sm font-medium text-slate-400">
                {formatDate(date, { weekday: 'long', month: 'long', day: 'numeric' })}
              </span>
            </div>

            {/* Maintenance for this date */}
            <div className="divide-y divide-white/5">
              {groupedMaintenance[date].map((item) => (
                <MaintenanceItem 
                  key={item.id}
                  maintenance={item}
                  isExpanded={expandedItem === item.id}
                  onToggle={() => setExpandedItem(
                    expandedItem === item.id ? null : item.id
                  )}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function MaintenanceItem({ maintenance, isExpanded, onToggle }) {
  const [updates, setUpdates] = useState([])
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const statusConfig = getIncidentStatusConfig(maintenance.status)

  useEffect(() => {
    if (isExpanded && !loaded) {
      fetchUpdates()
    }
  }, [isExpanded])

  const fetchUpdates = async () => {
    setLoading(true)
    try {
      const data = await api.getIncident(maintenance.id)
      setUpdates(data.updates || [])
      setLoaded(true)
    } catch (error) {
      console.error('Failed to fetch maintenance updates:', error)
    } finally {
      setLoading(false)
    }
  }

  // Calculate duration
  const getDuration = () => {
    if (!maintenance.scheduled_for) return null
    const start = new Date(maintenance.scheduled_for)
    const end = maintenance.scheduled_until 
      ? new Date(maintenance.scheduled_until)
      : maintenance.resolved_at 
      ? new Date(maintenance.resolved_at)
      : null
    
    if (!end) return null
    
    const diffMs = end - start
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMins / 60)
    
    if (diffHours > 0) return `${diffHours}h ${diffMins % 60}m`
    return `${diffMins}m`
  }

  return (
    <div className="px-5 py-4">
      <button 
        onClick={onToggle}
        className="w-full text-left"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-indigo-500" />
            <span className="font-medium text-white">{maintenance.title}</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig.bgClass} ${statusConfig.textClass}`}>
              {statusConfig.label}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {getDuration() && (
              <span className="text-xs text-slate-500 font-mono">{getDuration()}</span>
            )}
            <svg 
              className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* Schedule info */}
        <div className="flex items-center gap-4 mt-2 ml-5 text-sm text-slate-500">
          {maintenance.scheduled_for && (
            <div className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{formatDateTime(maintenance.scheduled_for)}</span>
            </div>
          )}
          {maintenance.scheduled_until && (
            <>
              <span>→</span>
              <span>{formatDateTime(maintenance.scheduled_until)}</span>
            </>
          )}
        </div>

        {/* Affected Services */}
        {maintenance.affected_services && maintenance.affected_services.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2 ml-5">
            {maintenance.affected_services.map((service) => (
              <span 
                key={service.id}
                className="px-2 py-0.5 bg-slate-800 rounded text-xs text-slate-400"
              >
                {service.name}
              </span>
            ))}
          </div>
        )}
      </button>

      {/* Expanded Updates */}
      {isExpanded && (
        <div className="mt-4 ml-5">
          {loading ? (
            <div className="flex items-center gap-2 text-slate-500 py-2">
              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-indigo-500"></div>
              <span className="text-sm">Loading updates...</span>
            </div>
          ) : updates.length > 0 ? (
            <div className="border-l-2 border-indigo-700/50 pl-4 space-y-4">
              {updates.map((update) => {
                const updateStatusConfig = getIncidentStatusConfig(update.status)
                return (
                  <div key={update.id} className="relative">
                    <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-indigo-700 border-2 border-indigo-600" />
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
            <p className="text-slate-500 text-sm py-2">No updates recorded for this maintenance.</p>
          )}
        </div>
      )}
    </div>
  )
}

