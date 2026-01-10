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

// Date formatting
export function formatDate(dateString, options = {}) {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...options
  })
}

export function formatDateTime(dateString) {
  const date = new Date(dateString)
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
}

export function formatRelativeTime(dateString) {
  const date = new Date(dateString)
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

