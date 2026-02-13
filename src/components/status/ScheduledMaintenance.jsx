import { formatDateTime, formatRelativeTime, getIncidentStatusConfig } from '../../lib/utils'

export default function ScheduledMaintenance({ maintenance }) {
  if (!maintenance || maintenance.length === 0) return null

  return (
    <section className="mb-8 animate-slide-up">
      <h2 className="text-lg font-semibold text-indigo-400 mb-4 flex items-center gap-2">
        <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
        Scheduled Maintenance
      </h2>
      <div className="space-y-4">
        {maintenance.map((item) => (
          <MaintenanceCard key={item.id} maintenance={item} />
        ))}
      </div>
    </section>
  )
}

function MaintenanceCard({ maintenance }) {
  const now = new Date()
  const scheduledFor = maintenance.scheduled_for ? new Date(maintenance.scheduled_for) : null
  const scheduledUntil = maintenance.scheduled_until ? new Date(maintenance.scheduled_until) : null
  const isOngoing = scheduledFor && now >= scheduledFor && (!scheduledUntil || now <= scheduledUntil)
  const isUpcoming = scheduledFor && now < scheduledFor
  const statusConfig = getIncidentStatusConfig(maintenance.status)

  return (
    <div className="glass rounded-xl border-l-4 border-indigo-500 overflow-hidden">
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-semibold text-white text-lg">{maintenance.title}</h3>
            <div className="flex items-center gap-3 mt-2">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                isOngoing 
                  ? 'bg-indigo-500/20 text-indigo-400' 
                  : 'bg-slate-700 text-slate-300'
              }`}>
                {isOngoing ? 'In Progress' : isUpcoming ? 'Upcoming' : 'In Progress'}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig.bgClass} ${statusConfig.textClass}`}>
                {statusConfig.label}
              </span>
            </div>
          </div>
          {maintenance.updates && maintenance.updates.length > 0 && (
            <span className="text-sm text-slate-500">
              {formatRelativeTime(maintenance.updates[0].created_at)}
            </span>
          )}
        </div>

        {/* Schedule */}
        {maintenance.scheduled_for && (
          <div className="flex items-center gap-4 text-sm text-slate-400 mb-4">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>{formatDateTime(maintenance.scheduled_for)}</span>
            </div>
            {maintenance.scheduled_until && (
              <>
                <span>→</span>
                <span>{formatDateTime(maintenance.scheduled_until)}</span>
              </>
            )}
          </div>
        )}

        {/* Affected Services */}
        {maintenance.affected_services && maintenance.affected_services.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {maintenance.affected_services.map((service) => (
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
        {maintenance.updates && maintenance.updates.length > 0 && (
          <div className="border-t border-white/5 pt-4">
            <div className="flex items-center gap-2 text-sm text-slate-400 mb-2">
              <span className="font-medium">Latest Update</span>
              <span>•</span>
              <span>{formatRelativeTime(maintenance.updates[0].created_at)}</span>
            </div>
            <p className="text-slate-300 text-sm leading-relaxed">
              {maintenance.updates[0].message}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

