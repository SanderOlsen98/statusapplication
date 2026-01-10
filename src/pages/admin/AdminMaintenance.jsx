import { useState, useEffect } from 'react'
import api from '../../lib/api'
import { getIncidentStatusConfig, formatDateTime, formatRelativeTime } from '../../lib/utils'

export default function AdminMaintenance() {
  const [maintenance, setMaintenance] = useState([])
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingMaintenance, setEditingMaintenance] = useState(null)
  const [showUpdateModal, setShowUpdateModal] = useState(null)
  const [filter, setFilter] = useState('upcoming')

  useEffect(() => {
    fetchData()
  }, [filter])

  const fetchData = async () => {
    try {
      const [maintenanceRes, servicesRes] = await Promise.all([
        api.getIncidents({ scheduled: 'true', include_resolved: filter === 'past' ? 'true' : 'false' }),
        api.getServices()
      ])
      
      // Filter based on selected tab
      let filtered = maintenanceRes
      if (filter === 'upcoming') {
        filtered = maintenanceRes.filter(m => m.status !== 'resolved')
      } else if (filter === 'past') {
        filtered = maintenanceRes.filter(m => m.status === 'resolved')
      }
      
      setMaintenance(filtered)
      setServices(servicesRes)
    } catch (error) {
      console.error('Failed to fetch maintenance:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveMaintenance = async (data) => {
    try {
      if (editingMaintenance?.id) {
        await api.updateIncident(editingMaintenance.id, { ...data, is_scheduled: true })
      } else {
        await api.createIncident({ ...data, is_scheduled: true })
      }
      setShowModal(false)
      setEditingMaintenance(null)
      fetchData()
    } catch (error) {
      console.error('Failed to save maintenance:', error)
      alert(error.message)
    }
  }

  const handleAddUpdate = async (maintenanceId, data) => {
    try {
      await api.addIncidentUpdate(maintenanceId, data)
      setShowUpdateModal(null)
      fetchData()
    } catch (error) {
      console.error('Failed to add update:', error)
      alert(error.message)
    }
  }

  const handleDeleteMaintenance = async (id) => {
    if (!confirm('Are you sure you want to delete this scheduled maintenance?')) return
    try {
      await api.deleteIncident(id)
      fetchData()
    } catch (error) {
      console.error('Failed to delete maintenance:', error)
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
          <h1 className="text-2xl font-bold text-white">Scheduled Maintenance</h1>
          <p className="text-slate-400 mt-1">Plan and manage maintenance windows</p>
        </div>
        <button
          onClick={() => {
            setEditingMaintenance(null)
            setShowModal(true)
          }}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
        >
          + Schedule Maintenance
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {['upcoming', 'past', 'all'].map((f) => (
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

      {/* Maintenance List */}
      <div className="space-y-4">
        {maintenance.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
            <div className="text-4xl mb-3">🔧</div>
            <p className="text-slate-400">No {filter === 'upcoming' ? 'upcoming' : filter === 'past' ? 'past' : ''} maintenance scheduled</p>
            <button
              onClick={() => {
                setEditingMaintenance(null)
                setShowModal(true)
              }}
              className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
            >
              Schedule Maintenance
            </button>
          </div>
        ) : (
          maintenance.map((item) => (
            <MaintenanceCard
              key={item.id}
              maintenance={item}
              onEdit={() => {
                setEditingMaintenance(item)
                setShowModal(true)
              }}
              onAddUpdate={() => setShowUpdateModal(item.id)}
              onDelete={() => handleDeleteMaintenance(item.id)}
            />
          ))
        )}
      </div>

      {/* Maintenance Modal */}
      {showModal && (
        <MaintenanceModal
          maintenance={editingMaintenance}
          services={services}
          onSave={handleSaveMaintenance}
          onClose={() => {
            setShowModal(false)
            setEditingMaintenance(null)
          }}
        />
      )}

      {/* Update Modal */}
      {showUpdateModal && (
        <UpdateModal
          maintenanceId={showUpdateModal}
          onSave={(data) => handleAddUpdate(showUpdateModal, data)}
          onClose={() => setShowUpdateModal(null)}
        />
      )}
    </div>
  )
}

function MaintenanceCard({ maintenance, onEdit, onAddUpdate, onDelete }) {
  const statusConfig = getIncidentStatusConfig(maintenance.status)
  const [expanded, setExpanded] = useState(false)

  const now = new Date()
  const scheduledFor = maintenance.scheduled_for ? new Date(maintenance.scheduled_for) : null
  const scheduledUntil = maintenance.scheduled_until ? new Date(maintenance.scheduled_until) : null
  
  let timeStatus = 'upcoming'
  if (scheduledFor && now >= scheduledFor) {
    if (!scheduledUntil || now <= scheduledUntil) {
      timeStatus = 'in_progress'
    } else {
      timeStatus = 'completed'
    }
  }

  return (
    <div className="bg-slate-900 border border-indigo-500/30 rounded-xl overflow-hidden">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                timeStatus === 'in_progress' 
                  ? 'bg-indigo-500/20 text-indigo-400'
                  : timeStatus === 'completed'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-slate-700 text-slate-300'
              }`}>
                {timeStatus === 'in_progress' ? 'In Progress' : timeStatus === 'completed' ? 'Completed' : 'Upcoming'}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig.bgClass} ${statusConfig.textClass}`}>
                {statusConfig.label}
              </span>
            </div>
            <h3 className="text-lg font-semibold text-white">{maintenance.title}</h3>
            <p className="text-slate-500 text-sm mt-1">
              Created {formatRelativeTime(maintenance.created_at)}
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

        {/* Schedule */}
        <div className="mt-4 p-4 bg-indigo-900/20 rounded-lg border border-indigo-500/20">
          <div className="flex items-center gap-6 text-sm">
            <div>
              <span className="text-slate-500 block text-xs mb-1">Starts</span>
              <span className="text-white font-medium">
                {maintenance.scheduled_for ? formatDateTime(maintenance.scheduled_for) : 'Not set'}
              </span>
            </div>
            <div className="text-slate-600">→</div>
            <div>
              <span className="text-slate-500 block text-xs mb-1">Ends</span>
              <span className="text-white font-medium">
                {maintenance.scheduled_until ? formatDateTime(maintenance.scheduled_until) : 'Not set'}
              </span>
            </div>
          </div>
        </div>

        {/* Affected Services */}
        {maintenance.affected_services && maintenance.affected_services.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
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

        {/* Updates */}
        {maintenance.updates && maintenance.updates.length > 0 && (
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
              {maintenance.updates.length} update{maintenance.updates.length !== 1 ? 's' : ''}
            </button>

            {expanded && (
              <div className="mt-4 border-l-2 border-indigo-700/50 pl-4 space-y-4">
                {maintenance.updates.map((update) => {
                  const updateStatusConfig = getIncidentStatusConfig(update.status)
                  return (
                    <div key={update.id} className="relative">
                      <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-indigo-700"></div>
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

function MaintenanceModal({ maintenance, services, onSave, onClose }) {
  const [formData, setFormData] = useState({
    title: maintenance?.title || '',
    status: maintenance?.status || 'investigating',
    impact: maintenance?.impact || 'none',
    message: '',
    service_ids: maintenance?.affected_services?.map(s => s.id) || [],
    scheduled_for: maintenance?.scheduled_for ? maintenance.scheduled_for.slice(0, 16) : '',
    scheduled_until: maintenance?.scheduled_until ? maintenance.scheduled_until.slice(0, 16) : ''
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
            {maintenance?.id ? 'Edit Maintenance' : 'Schedule Maintenance'}
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
              placeholder="Database server maintenance"
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Starts *</label>
              <input
                type="datetime-local"
                value={formData.scheduled_for}
                onChange={(e) => setFormData({ ...formData, scheduled_for: e.target.value })}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="investigating">Scheduled</option>
                <option value="identified">In Progress</option>
                <option value="monitoring">Verifying</option>
                <option value="resolved">Completed</option>
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

          {!maintenance?.id && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Initial Message</label>
              <textarea
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Describe the maintenance work..."
                rows={3}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>
          )}

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
              {maintenance?.id ? 'Save Changes' : 'Schedule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function UpdateModal({ maintenanceId, onSave, onClose }) {
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
              <option value="investigating">Scheduled</option>
              <option value="identified">In Progress</option>
              <option value="monitoring">Verifying</option>
              <option value="resolved">Completed</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Message *</label>
            <textarea
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder="Provide an update on the maintenance..."
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

