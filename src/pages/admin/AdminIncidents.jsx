import { useState, useEffect } from 'react'
import api from '../../lib/api'
import { getIncidentStatusConfig, getImpactConfig, formatDateTime, formatRelativeTime } from '../../lib/utils'

export default function AdminIncidents() {
  const [incidents, setIncidents] = useState([])
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingIncident, setEditingIncident] = useState(null)
  const [showUpdateModal, setShowUpdateModal] = useState(null)
  const [filter, setFilter] = useState('active')

  useEffect(() => {
    fetchData()
  }, [filter])

  const fetchData = async () => {
    try {
      const params = filter === 'active' 
        ? { scheduled: 'false' } 
        : filter === 'resolved' 
        ? { include_resolved: 'true', status: 'resolved', scheduled: 'false' }
        : { include_resolved: 'true', scheduled: 'false' }

      const [incidentsRes, servicesRes] = await Promise.all([
        api.getIncidents(params),
        api.getServices()
      ])
      setIncidents(incidentsRes)
      setServices(servicesRes)
    } catch (error) {
      console.error('Failed to fetch incidents:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveIncident = async (data) => {
    try {
      if (editingIncident?.id) {
        await api.updateIncident(editingIncident.id, data)
      } else {
        await api.createIncident(data)
      }
      setShowModal(false)
      setEditingIncident(null)
      fetchData()
    } catch (error) {
      console.error('Failed to save incident:', error)
      alert(error.message)
    }
  }

  const handleAddUpdate = async (incidentId, data) => {
    try {
      await api.addIncidentUpdate(incidentId, data)
      setShowUpdateModal(null)
      fetchData()
    } catch (error) {
      console.error('Failed to add update:', error)
      alert(error.message)
    }
  }

  const handleDeleteIncident = async (id) => {
    if (!confirm('Are you sure you want to delete this incident?')) return
    try {
      await api.deleteIncident(id)
      fetchData()
    } catch (error) {
      console.error('Failed to delete incident:', error)
    }
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Incidents</h1>
          <p className="text-slate-400 mt-1">Manage and track service incidents</p>
        </div>
        <button
          onClick={() => {
            setEditingIncident(null)
            setShowModal(true)
          }}
          className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors"
        >
          + Report Incident
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {['active', 'resolved', 'all'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === f
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Incidents List */}
      <div className="space-y-4">
        {incidents.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
            <div className="text-4xl mb-3">✓</div>
            <p className="text-slate-400">No incidents found</p>
          </div>
        ) : (
          incidents.map((incident) => (
            <IncidentCard
              key={incident.id}
              incident={incident}
              onEdit={() => {
                setEditingIncident(incident)
                setShowModal(true)
              }}
              onAddUpdate={() => setShowUpdateModal(incident.id)}
              onDelete={() => handleDeleteIncident(incident.id)}
            />
          ))
        )}
      </div>

      {/* Incident Modal */}
      {showModal && (
        <IncidentModal
          incident={editingIncident}
          services={services}
          onSave={handleSaveIncident}
          onClose={() => {
            setShowModal(false)
            setEditingIncident(null)
          }}
        />
      )}

      {/* Update Modal */}
      {showUpdateModal && (
        <UpdateModal
          incidentId={showUpdateModal}
          onSave={(data) => handleAddUpdate(showUpdateModal, data)}
          onClose={() => setShowUpdateModal(null)}
        />
      )}
    </div>
  )
}

function IncidentCard({ incident, onEdit, onAddUpdate, onDelete }) {
  const statusConfig = getIncidentStatusConfig(incident.status)
  const impactConfig = getImpactConfig(incident.impact)
  const [expanded, setExpanded] = useState(false)

  return (
    <div className={`bg-slate-900 border rounded-xl overflow-hidden ${
      incident.is_scheduled ? 'border-indigo-500/30' : 'border-slate-800'
    }`}>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              {incident.is_scheduled && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-500/20 text-indigo-400">
                  Scheduled
                </span>
              )}
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig.bgClass} ${statusConfig.textClass}`}>
                {statusConfig.label}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium bg-${impactConfig.color}-500/20 text-${impactConfig.color}-400`}>
                {impactConfig.label}
              </span>
            </div>
            <h3 className="text-lg font-semibold text-white">{incident.title}</h3>
            <p className="text-slate-500 text-sm mt-1">
              Created {formatRelativeTime(incident.created_at)}
              {incident.resolved_at && (
                <> • Resolved {formatRelativeTime(incident.resolved_at)}</>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onAddUpdate}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-sm rounded-lg transition-colors"
            >
              + Update
            </button>
            <button
              onClick={onEdit}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
            <button
              onClick={onDelete}
              className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Affected Services */}
        {incident.affected_services && incident.affected_services.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
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

        {/* Schedule */}
        {incident.is_scheduled && incident.scheduled_for && (
          <div className="mt-4 p-3 bg-slate-800/50 rounded-lg">
            <div className="flex items-center gap-4 text-sm text-slate-400">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>{formatDateTime(incident.scheduled_for)}</span>
              </div>
              {incident.scheduled_until && (
                <>
                  <span>→</span>
                  <span>{formatDateTime(incident.scheduled_until)}</span>
                </>
              )}
            </div>
          </div>
        )}

        {/* Updates */}
        {incident.updates && incident.updates.length > 0 && (
          <div className="mt-4">
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
            >
              <svg
                className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              {incident.updates.length} update{incident.updates.length !== 1 ? 's' : ''}
            </button>

            {expanded && (
              <div className="mt-4 border-l-2 border-slate-700 pl-4 space-y-4">
                {incident.updates.map((update) => {
                  const updateStatusConfig = getIncidentStatusConfig(update.status)
                  return (
                    <div key={update.id} className="relative">
                      <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-slate-700"></div>
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
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function IncidentModal({ incident, services, onSave, onClose }) {
  const [formData, setFormData] = useState({
    title: incident?.title || '',
    status: incident?.status || 'investigating',
    impact: incident?.impact || 'minor',
    message: '',
    service_ids: incident?.affected_services?.map(s => s.id) || [],
    is_scheduled: incident?.is_scheduled || false,
    scheduled_for: incident?.scheduled_for ? incident.scheduled_for.slice(0, 16) : '',
    scheduled_until: incident?.scheduled_until ? incident.scheduled_until.slice(0, 16) : ''
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave(formData)
  }

  const toggleService = (serviceId) => {
    setFormData({
      ...formData,
      service_ids: formData.service_ids.includes(serviceId)
        ? formData.service_ids.filter(id => id !== serviceId)
        : [...formData.service_ids, serviceId]
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">
            {incident?.id ? 'Edit Incident' : formData.is_scheduled ? 'Schedule Maintenance' : 'Report Incident'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder={formData.is_scheduled ? "Scheduled database maintenance" : "API experiencing high latency"}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="investigating">Investigating</option>
                <option value="identified">Identified</option>
                <option value="monitoring">Monitoring</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Impact</label>
              <select
                value={formData.impact}
                onChange={(e) => setFormData({ ...formData, impact: e.target.value })}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="none">None</option>
                <option value="minor">Minor</option>
                <option value="major">Major</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          {!incident?.id && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Initial Message</label>
              <textarea
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Describe what's happening..."
                rows={3}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>
          )}

          <div>
            <label className="flex items-center gap-2 mb-4">
              <input
                type="checkbox"
                checked={formData.is_scheduled}
                onChange={(e) => setFormData({ ...formData, is_scheduled: e.target.checked })}
                className="w-4 h-4 rounded border-slate-600 text-indigo-600 focus:ring-indigo-500 bg-slate-700"
              />
              <span className="text-sm text-slate-300">Scheduled maintenance</span>
            </label>

            {formData.is_scheduled && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Starts</label>
                  <input
                    type="datetime-local"
                    value={formData.scheduled_for}
                    onChange={(e) => setFormData({ ...formData, scheduled_for: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Ends</label>
                  <input
                    type="datetime-local"
                    value={formData.scheduled_until}
                    onChange={(e) => setFormData({ ...formData, scheduled_until: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Affected Services</label>
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 bg-slate-800 rounded-lg border border-slate-700">
              {services.map((service) => (
                <label key={service.id} className="flex items-center gap-2 p-2 hover:bg-slate-700 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.service_ids.includes(service.id)}
                    onChange={() => toggleService(service.id)}
                    className="w-4 h-4 rounded border-slate-600 text-indigo-600 focus:ring-indigo-500 bg-slate-700"
                  />
                  <span className="text-sm text-slate-300 truncate">{service.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
            >
              {incident?.id ? 'Save Changes' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function UpdateModal({ incidentId, onSave, onClose }) {
  const [formData, setFormData] = useState({
    status: 'investigating',
    message: ''
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Add Update</h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="investigating">Investigating</option>
              <option value="identified">Identified</option>
              <option value="monitoring">Monitoring</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Message *</label>
            <textarea
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder="Provide an update on the situation..."
              rows={4}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              required
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
            >
              Post Update
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

