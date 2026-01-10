import { getStatusConfig } from '../../lib/utils'

export default function StatusHeader({ siteName, systemStatus, lastUpdated }) {
  const statusConfig = systemStatus ? getStatusConfig(systemStatus.status) : null

  return (
    <header className="pt-12 pb-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Logo/Title */}
        <div className="text-center mb-8 animate-fade-in">
          <h1 className="text-3xl md:text-4xl font-bold mb-2 gradient-text">
            {siteName}
          </h1>
          <p className="text-slate-400 text-sm">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>

        {/* Overall Status Banner */}
        {systemStatus && (
          <div 
            className={`glass rounded-2xl p-6 text-center animate-slide-up transition-all duration-500 ${
              systemStatus.status === 'operational' 
                ? 'border-emerald-500/30' 
                : systemStatus.status === 'major_outage'
                ? 'border-red-500/30'
                : 'border-amber-500/30'
            }`}
          >
            <div className="flex items-center justify-center gap-3 mb-2">
              <span 
                className={`w-4 h-4 rounded-full ${statusConfig?.bgColor} ${
                  systemStatus.status !== 'operational' ? 'animate-pulse' : ''
                }`}
              />
              <span className={`text-2xl font-semibold ${statusConfig?.textColor}`}>
                {systemStatus.message}
              </span>
            </div>
            <div className="flex items-center justify-center gap-6 text-sm text-slate-400 mt-4">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                <span>{systemStatus.services?.operational || 0} Operational</span>
              </div>
              {systemStatus.services?.degraded > 0 && (
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                  <span>{systemStatus.services.degraded} Degraded</span>
                </div>
              )}
              {(systemStatus.services?.partial_outage > 0 || systemStatus.services?.major_outage > 0) && (
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                  <span>{(systemStatus.services.partial_outage || 0) + (systemStatus.services.major_outage || 0)} Outage</span>
                </div>
              )}
              {systemStatus.services?.maintenance > 0 && (
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
                  <span>{systemStatus.services.maintenance} Maintenance</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  )
}

