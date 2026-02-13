// Status utilities
export const STATUS_CONFIG = {
  operational: {
    label: 'Operational',
    color: 'emerald',
    bgColor: 'bg-emerald-500',
    textColor: 'text-emerald-400',
    icon: '✓'
  },
  degraded: {
    label: 'Degraded Performance',
    color: 'amber',
    bgColor: 'bg-amber-500',
    textColor: 'text-amber-400',
    icon: '⚠'
  },
  partial_outage: {
    label: 'Partial Outage',
    color: 'orange',
    bgColor: 'bg-orange-500',
    textColor: 'text-orange-400',
    icon: '◐'
  },
  major_outage: {
    label: 'Major Outage',
    color: 'red',
    bgColor: 'bg-red-500',
    textColor: 'text-red-400',
    icon: '✕'
  },
  maintenance: {
    label: 'Maintenance',
    color: 'indigo',
    bgColor: 'bg-indigo-500',
    textColor: 'text-indigo-400',
    icon: '🔧'
  }
}

export const INCIDENT_STATUS_CONFIG = {
  investigating: {
    label: 'Investigating',
    color: 'red',
    bgClass: 'bg-red-500/20',
    textClass: 'text-red-400'
  },
  identified: {
    label: 'Identified',
    color: 'orange',
    bgClass: 'bg-orange-500/20',
    textClass: 'text-orange-400'
  },
  monitoring: {
    label: 'Monitoring',
    color: 'indigo',
    bgClass: 'bg-indigo-500/20',
    textClass: 'text-indigo-400'
  },
  resolved: {
    label: 'Resolved',
    color: 'emerald',
    bgClass: 'bg-emerald-500/20',
    textClass: 'text-emerald-400'
  }
}

export const IMPACT_CONFIG = {
  none: { label: 'None', color: 'slate' },
  minor: { label: 'Minor', color: 'amber' },
  major: { label: 'Major', color: 'orange' },
  critical: { label: 'Critical', color: 'red' }
}

export function getStatusConfig(status) {
  return STATUS_CONFIG[status] || STATUS_CONFIG.operational
}

export function getIncidentStatusConfig(status) {
  return INCIDENT_STATUS_CONFIG[status] || INCIDENT_STATUS_CONFIG.investigating
}

export function getImpactConfig(impact) {
  return IMPACT_CONFIG[impact] || IMPACT_CONFIG.minor
}

// Date formatting - Norwegian locale with 24-hour time
export function formatDate(dateString, options = {}) {
  const date = new Date(dateString)
  return date.toLocaleDateString('nb-NO', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...options
  })
}

export function formatDateTime(dateString) {
  if (!dateString) return ''
  
  // Timestamps with space separator (e.g., "2026-02-13 09:25:52") are from SQLite CURRENT_TIMESTAMP (UTC)
  // Timestamps with T separator (e.g., "2026-02-13T10:30") are from datetime-local input (local time)
  let normalizedDateString = dateString
  
  if (dateString.includes(' ') && !dateString.includes('T')) {
    // SQLite CURRENT_TIMESTAMP format - treat as UTC
    normalizedDateString = dateString.replace(' ', 'T') + 'Z'
  }
  // datetime-local input format (with T) - already local time, don't add Z
  
  const date = new Date(normalizedDateString)
  return date.toLocaleString('nb-NO', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })
}

export function formatRelativeTime(dateString) {
  // Database stores timestamps in UTC without the Z suffix
  // Append Z if the string doesn't already have timezone info
  let normalizedDateString = dateString
  if (dateString && !dateString.includes('Z') && !dateString.includes('+') && !dateString.includes('T')) {
    // Format: "2026-02-13 09:25:52" -> "2026-02-13T09:25:52Z"
    normalizedDateString = dateString.replace(' ', 'T') + 'Z'
  } else if (dateString && dateString.includes('T') && !dateString.includes('Z') && !dateString.includes('+')) {
    // Format: "2026-02-13T09:25:52" -> "2026-02-13T09:25:52Z"
    normalizedDateString = dateString + 'Z'
  }
  
  const date = new Date(normalizedDateString)
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return formatDate(dateString)
}

// Uptime calculations
export function calculateOverallUptime(uptimeHistory) {
  if (!uptimeHistory || uptimeHistory.length === 0) return 100
  const total = uptimeHistory.reduce((sum, day) => sum + parseFloat(day.uptime_percentage), 0)
  return (total / uptimeHistory.length).toFixed(2)
}

export function getUptimeColor(percentage) {
  if (percentage >= 99.9) return 'bg-emerald-500'
  if (percentage >= 99) return 'bg-emerald-400'
  if (percentage >= 95) return 'bg-amber-500'
  if (percentage >= 90) return 'bg-orange-500'
  return 'bg-red-500'
}

export function getUptimeTextColor(percentage) {
  if (percentage >= 99.9) return 'text-emerald-400'
  if (percentage >= 99) return 'text-emerald-400'
  if (percentage >= 95) return 'text-amber-400'
  if (percentage >= 90) return 'text-orange-400'
  return 'text-red-400'
}

// Group services by status for summary
export function groupServicesByStatus(services) {
  return services.reduce((acc, service) => {
    const status = service.status || 'operational'
    if (!acc[status]) acc[status] = []
    acc[status].push(service)
    return acc
  }, {})
}

