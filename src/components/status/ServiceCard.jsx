import { useState, useEffect } from 'react'
import api from '../../lib/api'
import { getStatusConfig, getUptimeColor } from '../../lib/utils'

export default function ServiceCard({ service, isLast }) {
  const [uptimeData, setUptimeData] = useState(null)
  const [hoveredDay, setHoveredDay] = useState(null)
  const statusConfig = getStatusConfig(service.status)

  useEffect(() => {
    fetchUptime()
  }, [service.id])

  const fetchUptime = async () => {
    try {
      const data = await api.getServiceUptime(service.id, 90)
      setUptimeData(data)
    } catch (error) {
      console.error('Failed to fetch uptime:', error)
    }
  }

  return (
    <div 
      className={`px-6 py-4 ${!isLast ? 'border-b border-white/5' : ''} hover:bg-white/5 transition-colors`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className={`w-2 h-2 rounded-full ${statusConfig.bgColor} ${
            service.status !== 'operational' ? 'animate-pulse' : ''
          }`} />
          <div>
            <span className="font-medium text-white">{service.name}</span>
            {service.description && (
              <p className="text-sm text-slate-500">{service.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className={`text-sm font-medium ${statusConfig.textColor}`}>
            {statusConfig.label}
          </span>
          {uptimeData && (
            <span className="text-sm text-slate-400 font-mono">
              {uptimeData.overall_uptime}%
            </span>
          )}
        </div>
      </div>

      {/* Uptime Bar - Always visible */}
      <div className="mt-4 relative">
        {uptimeData && uptimeData.days && uptimeData.days.length > 0 ? (
          <>
            <div className="uptime-bar">
              {uptimeData.days.slice(-90).map((day, index) => (
                <div
                  key={day.date}
                  className={`uptime-day ${getUptimeColor(parseFloat(day.uptime_percentage))}`}
                  onMouseEnter={() => setHoveredDay({ ...day, index })}
                  onMouseLeave={() => setHoveredDay(null)}
                  style={{ opacity: parseFloat(day.uptime_percentage) < 100 ? 1 : 0.7 }}
                />
              ))}
            </div>
            
            {/* Tooltip */}
            {hoveredDay && (
              <div 
                className="absolute z-20 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm shadow-xl"
                style={{ 
                  bottom: '100%',
                  left: `${(hoveredDay.index / 90) * 100}%`,
                  transform: 'translateX(-50%)',
                  marginBottom: '8px'
                }}
              >
                <div className="font-medium text-white">{new Date(hoveredDay.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                <div className="text-slate-400">
                  {parseFloat(hoveredDay.uptime_percentage).toFixed(2)}% uptime
                </div>
                {hoveredDay.avg_response_time && (
                  <div className="text-slate-500 text-xs">
                    {hoveredDay.avg_response_time}ms avg response
                  </div>
                )}
              </div>
            )}
            
            {/* Timeline labels */}
            <div className="flex justify-between mt-2 text-xs text-slate-500">
              <span>90 days ago</span>
              <span>Today</span>
            </div>
          </>
        ) : (
          <>
            <div className="uptime-bar">
              {[...Array(90)].map((_, index) => (
                <div
                  key={index}
                  className="uptime-day bg-emerald-500"
                  style={{ opacity: 0.7 }}
                />
              ))}
            </div>
            <div className="flex justify-between mt-2 text-xs text-slate-500">
              <span>90 days ago</span>
              <span>Today</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

