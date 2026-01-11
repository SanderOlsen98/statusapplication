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

  // Metrics
  getMetrics: () => request('/metrics'),
  getMetric: (id, hours = 24) => request(`/metrics/${id}?hours=${hours}`),
  getMetricPoints: (id, hours = 24) => request(`/metrics/${id}/points?hours=${hours}`),
  createMetric: (data) => request('/metrics', { method: 'POST', body: JSON.stringify(data) }),
  updateMetric: (id, data) => request(`/metrics/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteMetric: (id) => request(`/metrics/${id}`, { method: 'DELETE' }),
  addMetricPoint: (id, value, recorded_at) => request(`/metrics/${id}/points`, { method: 'POST', body: JSON.stringify({ value, recorded_at }) }),

  // Subscribers
  getSubscribers: () => request('/subscribers'),
  getSubscriber: (id) => request(`/subscribers/${id}`),
  getSubscriberStats: () => request('/subscribers/admin/stats'),
  createSubscriber: (data) => request('/subscribers', { method: 'POST', body: JSON.stringify(data) }),
  updateSubscriber: (id, data) => request(`/subscribers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSubscriber: (id) => request(`/subscribers/${id}`, { method: 'DELETE' }),
  subscribe: (data) => request('/subscribers/subscribe', { method: 'POST', body: JSON.stringify(data) }),

  // Incident Templates
  getTemplates: () => request('/templates'),
  getTemplate: (id) => request(`/templates/${id}`),
  createTemplate: (data) => request('/templates', { method: 'POST', body: JSON.stringify(data) }),
  updateTemplate: (id, data) => request(`/templates/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTemplate: (id) => request(`/templates/${id}`, { method: 'DELETE' }),
  useTemplate: (id, service_ids) => request(`/templates/${id}/use`, { method: 'POST', body: JSON.stringify({ service_ids }) }),
}

export default api

