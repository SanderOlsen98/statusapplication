import { getIncidentStatusConfig, getImpactConfig, formatDateTime, formatRelativeTime } from '../../lib/utils'

export default function ActiveIncidents({ incidents }) {
  if (!incidents || incidents.length === 0) return null

  return (
    <section className="mb-8 animate-slide-up">
      <h2 className="text-lg font-semibold text-red-400 mb-4 flex items-center gap-2">
        <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
        Active Incidents
      </h2>
      <div className="space-y-4">
        {incidents.map((incident) => (
          <IncidentCard key={incident.id} incident={incident} />
        ))}
      </div>
    </section>
  )
}

function IncidentCard({ incident }) {
  const statusConfig = getIncidentStatusConfig(incident.status)
  const impactConfig = getImpactConfig(incident.impact)

  return (
    <div className="glass rounded-xl border-l-4 border-red-500 overflow-hidden">
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-semibold text-white text-lg">{incident.title}</h3>
            <div className="flex items-center gap-3 mt-2">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig.bgClass} ${statusConfig.textClass}`}>
                {statusConfig.label}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium bg-${impactConfig.color}-500/20 text-${impactConfig.color}-400`}>
                {impactConfig.label} Impact
              </span>
            </div>
          </div>
          <span className="text-sm text-slate-500">
            {formatRelativeTime(incident.created_at)}
          </span>
        </div>

        {/* Affected Services */}
        {incident.affected_services && incident.affected_services.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {incident.affected_services.map((service) => (
              <span 
                key={service.id}
                className="px-2 py-1 bg-slate-800 rounded text-xs text-slate-300"
              >
                {service.name}
              </span>
            ))}
          </div>
        )}

        {/* Latest Update */}
        {incident.updates && incident.updates.length > 0 && (
          <div className="border-t border-white/5 pt-4 mt-4">
            <div className="flex items-center gap-2 text-sm text-slate-400 mb-2">
              <span className="font-medium">Latest Update</span>
              <span>•</span>
              <span>{formatRelativeTime(incident.updates[0].created_at)}</span>
            </div>
            <p className="text-slate-300 text-sm leading-relaxed">
              {incident.updates[0].message}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

