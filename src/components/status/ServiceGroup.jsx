import { useState } from 'react'
import ServiceCard from './ServiceCard'

export default function ServiceGroup({ group, animationDelay = 0 }) {
  const [expanded, setExpanded] = useState(true)

  // Calculate group status summary
  const statusCounts = group.services?.reduce((acc, service) => {
    acc[service.status] = (acc[service.status] || 0) + 1
    return acc
  }, {}) || {}

  const allOperational = statusCounts.operational === group.services?.length

  return (
    <div 
      className="glass rounded-xl overflow-hidden animate-slide-up"
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      {/* Group Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className={`w-3 h-3 rounded-full ${
            allOperational 
              ? 'bg-emerald-500' 
              : statusCounts.major_outage 
              ? 'bg-red-500' 
              : statusCounts.partial_outage
              ? 'bg-orange-500'
              : 'bg-amber-500'
          }`} />
          <h3 className="font-semibold text-white">{group.name}</h3>
          <span className="text-slate-500 text-sm">
            {group.services?.length || 0} services
          </span>
        </div>
        <div className="flex items-center gap-4">
          {!allOperational && (
            <div className="flex items-center gap-2 text-sm">
              {statusCounts.major_outage > 0 && (
                <span className="text-red-400">{statusCounts.major_outage} down</span>
              )}
              {statusCounts.degraded > 0 && (
                <span className="text-amber-400">{statusCounts.degraded} degraded</span>
              )}
            </div>
          )}
          <svg 
            className={`w-5 h-5 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Services List */}
      {expanded && group.services && group.services.length > 0 && (
        <div className="border-t border-white/5">
          {group.services.map((service, index) => (
            <ServiceCard 
              key={service.id} 
              service={service}
              isLast={index === group.services.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

