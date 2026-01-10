import { useState, useEffect } from 'react'
import api from '../../lib/api'
import { getIncidentStatusConfig, formatDate, formatDateTime } from '../../lib/utils'

export default function IncidentHistory({ incidents }) {
  const [expandedIncident, setExpandedIncident] = useState(null)

  // Group incidents by date
  const groupedIncidents = incidents.reduce((groups, incident) => {
    const date = new Date(incident.created_at).toDateString()
    if (!groups[date]) groups[date] = []
    groups[date].push(incident)
    return groups
  }, {})

  const dates = Object.keys(groupedIncidents)

  if (dates.length === 0) {
    return (
      <section className="animate-slide-up">
        <h2 className="text-lg font-semibold text-slate-300 mb-6 flex items-center gap-2">
          <span className="w-2 h-2 bg-slate-500 rounded-full"></span>
          Past Incidents
        </h2>
        <div className="glass rounded-xl p-8 text-center">
          <div className="text-4xl mb-3">✓</div>
          <p className="text-slate-400">No incidents reported in the last 14 days.</p>
          <p className="text-slate-500 text-sm mt-1">All systems have been running smoothly!</p>
        </div>
      </section>
    )
  }

  return (
    <section className="animate-slide-up">
      <h2 className="text-lg font-semibold text-slate-300 mb-6 flex items-center gap-2">
        <span className="w-2 h-2 bg-slate-500 rounded-full"></span>
        Past Incidents
      </h2>
      <div className="space-y-6">
        {dates.map((date) => (
          <div key={date} className="glass rounded-xl overflow-hidden">
            {/* Date Header */}
            <div className="px-5 py-3 bg-slate-800/50 border-b border-white/5">
              <span className="text-sm font-medium text-slate-400">
                {formatDate(date, { weekday: 'long', month: 'long', day: 'numeric' })}
              </span>
            </div>

            {/* Incidents for this date */}
            <div className="divide-y divide-white/5">
              {groupedIncidents[date].map((incident) => (
                <HistoryItem 
                  key={incident.id}
                  incident={incident}
                  isExpanded={expandedIncident === incident.id}
                  onToggle={() => setExpandedIncident(
                    expandedIncident === incident.id ? null : incident.id
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

function HistoryItem({ incident, isExpanded, onToggle }) {
  const [updates, setUpdates] = useState([])
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const statusConfig = getIncidentStatusConfig(incident.status)

  useEffect(() => {
    if (isExpanded && !loaded) {
      fetchUpdates()
    }
  }, [isExpanded])

  const fetchUpdates = async () => {
    setLoading(true)
    try {
      const data = await api.getIncident(incident.id)
      setUpdates(data.updates || [])
      setLoaded(true)
    } catch (error) {
      console.error('Failed to fetch incident updates:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="px-5 py-4">
      <button 
        onClick={onToggle}
        className="w-full text-left"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className={`w-2 h-2 rounded-full ${
              incident.status === 'resolved' ? 'bg-emerald-500' : 'bg-amber-500'
            }`} />
            <span className="font-medium text-white">{incident.title}</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig.bgClass} ${statusConfig.textClass}`}>
              {statusConfig.label}
            </span>
          </div>
          <svg 
            className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {/* Affected Services */}
        {incident.affected_services && incident.affected_services.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2 ml-5">
            {incident.affected_services.map((service) => (
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
            <div className="border-l-2 border-slate-700 pl-4 space-y-4">
              {updates.map((update) => {
                const updateStatusConfig = getIncidentStatusConfig(update.status)
                return (
                  <div key={update.id} className="relative">
                    <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-slate-700 border-2 border-slate-600" />
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
            <p className="text-slate-500 text-sm py-2">No updates recorded for this incident.</p>
          )}
        </div>
      )}
    </div>
  )
}
