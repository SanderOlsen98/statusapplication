const API_BASE = '/api'

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('staytus_token')
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...options.headers
    },
    ...options
  }

  const response = await fetch(`${API_BASE}${endpoint}`, config)
  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || 'Request failed')
  }

  return data
}

export const api = {
  // Settings
  getSettings: () => request('/settings'),
  getSystemStatus: () => request('/settings/status'),
  updateSettings: (settings) => request('/settings', { method: 'PUT', body: JSON.stringify(settings) }),

  // Services
  getServiceGroups: () => request('/services/groups'),
  getServices: () => request('/services'),
  getService: (id) => request(`/services/${id}`),
  getServiceUptime: (id, days = 90) => request(`/services/${id}/uptime?days=${days}`),
  createService: (data) => request('/services', { method: 'POST', body: JSON.stringify(data) }),
  updateService: (id, data) => request(`/services/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  updateServiceStatus: (id, status) => request(`/services/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  deleteService: (id) => request(`/services/${id}`, { method: 'DELETE' }),

  // Service Groups
  createServiceGroup: (data) => request('/services/groups', { method: 'POST', body: JSON.stringify(data) }),
  updateServiceGroup: (id, data) => request(`/services/groups/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteServiceGroup: (id) => request(`/services/groups/${id}`, { method: 'DELETE' }),

  // Incidents
  getIncidents: (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return request(`/incidents${query ? `?${query}` : ''}`)
  },
  getActiveIncidents: () => request('/incidents/active'),
  getScheduledMaintenance: () => request('/incidents/scheduled'),
  getIncident: (id) => request(`/incidents/${id}`),
  getIncidentHistory: (days = 7) => request(`/incidents/history/${days}`),
  createIncident: (data) => request('/incidents', { method: 'POST', body: JSON.stringify(data) }),
  updateIncident: (id, data) => request(`/incidents/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteIncident: (id) => request(`/incidents/${id}`, { method: 'DELETE' }),
  addIncidentUpdate: (id, data) => request(`/incidents/${id}/updates`, { method: 'POST', body: JSON.stringify(data) }),
  deleteIncidentUpdate: (id, updateId) => request(`/incidents/${id}/updates/${updateId}`, { method: 'DELETE' }),

  // Monitor
  triggerMonitorCheck: () => request('/monitor/check', { method: 'POST' }),
  testUrl: (url) => request('/monitor/test', { method: 'POST', body: JSON.stringify({ url }) }),
  getMonitorRecords: (serviceId) => request(`/monitor/records/${serviceId}`),
}

export default api

