import { useState, useEffect } from 'react'
import api from '../../lib/api'
import { getStatusConfig } from '../../lib/utils'

export default function AdminServices() {
  const [serviceGroups, setServiceGroups] = useState([])
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [showServiceModal, setShowServiceModal] = useState(false)
  const [showGroupModal, setShowGroupModal] = useState(false)
  const [editingService, setEditingService] = useState(null)
  const [editingGroup, setEditingGroup] = useState(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [groupsRes, servicesRes] = await Promise.all([
        api.getServiceGroups(),
        api.getServices()
      ])
      setServiceGroups(groupsRes)
      setServices(servicesRes)
    } catch (error) {
      console.error('Failed to fetch services:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveService = async (data) => {
    try {
      if (editingService?.id) {
        await api.updateService(editingService.id, data)
      } else {
        await api.createService(data)
      }
      setShowServiceModal(false)
      setEditingService(null)
      fetchData()
    } catch (error) {
      console.error('Failed to save service:', error)
      alert(error.message)
    }
  }

  const handleDeleteService = async (id) => {
    if (!confirm('Are you sure you want to delete this service?')) return
    try {
      await api.deleteService(id)
      fetchData()
    } catch (error) {
      console.error('Failed to delete service:', error)
    }
  }

  const handleSaveGroup = async (data) => {
    try {
      if (editingGroup?.id) {
        await api.updateServiceGroup(editingGroup.id, data)
      } else {
        await api.createServiceGroup(data)
      }
      setShowGroupModal(false)
      setEditingGroup(null)
      fetchData()
    } catch (error) {
      console.error('Failed to save group:', error)
      alert(error.message)
    }
  }

  const handleDeleteGroup = async (id) => {
    if (!confirm('Are you sure you want to delete this group?')) return
    try {
      await api.deleteServiceGroup(id)
      fetchData()
    } catch (error) {
      console.error('Failed to delete group:', error)
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
          <h1 className="text-2xl font-bold text-white">Services</h1>
          <p className="text-slate-400 mt-1">Manage your monitored services and groups</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => {
              setEditingGroup(null)
              setShowGroupModal(true)
            }}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
          >
            + New Group
          </button>
          <button
            onClick={() => {
              setEditingService(null)
              setShowServiceModal(true)
            }}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
          >
            + New Service
          </button>
        </div>
      </div>

      {/* Service Groups */}
      <div className="space-y-6">
        {serviceGroups.map((group) => (
          <div key={group.id || 'ungrouped'} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            {/* Group Header */}
            <div className="px-6 py-4 bg-slate-800/50 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-white">{group.name}</h2>
                {group.description && (
                  <p className="text-slate-400 text-sm mt-1">{group.description}</p>
                )}
              </div>
              {group.id && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEditingGroup(group)
                      setShowGroupModal(true)
                    }}
                    className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDeleteGroup(group.id)}
                    className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              )}
            </div>

            {/* Services */}
            <div className="divide-y divide-slate-800">
              {group.services && group.services.length > 0 ? (
                group.services.map((service) => {
                  const statusConfig = getStatusConfig(service.status)
                  return (
                    <div key={service.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-800/30 transition-colors">
                      <div className="flex items-center gap-4">
                        <span className={`w-3 h-3 rounded-full ${statusConfig.bgColor}`}></span>
                        <div>
                          <h3 className="font-medium text-white">{service.name}</h3>
                          <div className="flex items-center gap-3 mt-1">
                            {service.description && (
                              <span className="text-slate-500 text-sm">{service.description}</span>
                            )}
                            <span className={`text-sm ${statusConfig.textColor}`}>
                              {statusConfig.label}
                            </span>
                            {(service.monitor_type === 'http' || service.monitor_type === 'ping') && service.monitor_url && (
                              <span className="text-slate-600 text-xs font-mono">
                                {service.monitor_type === 'ping' ? `ping: ${service.monitor_url}` : service.monitor_url}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditingService(service)
                            setShowServiceModal(true)
                          }}
                          className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteService(service.id)}
                          className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-lg transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="px-6 py-8 text-center text-slate-500">
                  No services in this group
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Service Modal */}
      {showServiceModal && (
        <ServiceModal
          service={editingService}
          groups={serviceGroups.filter(g => g.id)}
          onSave={handleSaveService}
          onClose={() => {
            setShowServiceModal(false)
            setEditingService(null)
          }}
        />
      )}

      {/* Group Modal */}
      {showGroupModal && (
        <GroupModal
          group={editingGroup}
          onSave={handleSaveGroup}
          onClose={() => {
            setShowGroupModal(false)
            setEditingGroup(null)
          }}
        />
      )}
    </div>
  )
}

function ServiceModal({ service, groups, onSave, onClose }) {
  const [formData, setFormData] = useState({
    name: service?.name || '',
    description: service?.description || '',
    group_id: service?.group_id || '',
    status: service?.status || 'operational',
    monitor_type: service?.monitor_type || 'manual',
    monitor_url: service?.monitor_url || '',
    display_order: service?.display_order || 0
  })
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave({
      ...formData,
      group_id: formData.group_id || null
    })
  }

  const handleTestUrl = async () => {
    if (!formData.monitor_url) return
    setTesting(true)
    setTestResult(null)
    try {
      const result = await api.testUrl(formData.monitor_url, formData.monitor_type)
      setTestResult(result)
    } catch (error) {
      setTestResult({ success: false, error: error.message })
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">
            {service ? 'Edit Service' : 'New Service'}
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
            <label className="block text-sm font-medium text-slate-300 mb-2">Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Group</label>
            <select
              value={formData.group_id}
              onChange={(e) => setFormData({ ...formData, group_id: e.target.value })}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">No Group</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>{group.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="operational">Operational</option>
              <option value="degraded">Degraded</option>
              <option value="partial_outage">Partial Outage</option>
              <option value="major_outage">Major Outage</option>
              <option value="maintenance">Maintenance</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Monitoring Type</label>
            <select
              value={formData.monitor_type}
              onChange={(e) => setFormData({ ...formData, monitor_type: e.target.value })}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="manual">Manual</option>
              <option value="http">HTTP Check</option>
              <option value="ping">Ping</option>
            </select>
          </div>

          {formData.monitor_type === 'ping' && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Host to Ping</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.monitor_url}
                  onChange={(e) => setFormData({ ...formData, monitor_url: e.target.value })}
                  placeholder="example.com or 192.168.1.1"
                  className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={handleTestUrl}
                  disabled={testing || !formData.monitor_url}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {testing ? 'Testing...' : 'Test'}
                </button>
              </div>
              {testResult && (
                <div className={`mt-2 p-3 rounded-lg text-sm ${
                  testResult.success && testResult.ok 
                    ? 'bg-emerald-500/20 text-emerald-400' 
                    : 'bg-red-500/20 text-red-400'
                }`}>
                  {testResult.success && testResult.ok ? (
                    <>✓ Host is reachable ({testResult.responseTime}ms)</>
                  ) : (
                    <>✕ {testResult.error || 'Host unreachable'}</>
                  )}
                </div>
              )}
            </div>
          )}

          {formData.monitor_type === 'http' && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Monitor URL</label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={formData.monitor_url}
                  onChange={(e) => setFormData({ ...formData, monitor_url: e.target.value })}
                  placeholder="https://example.com/health"
                  className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={handleTestUrl}
                  disabled={testing || !formData.monitor_url}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {testing ? 'Testing...' : 'Test'}
                </button>
              </div>
              {testResult && (
                <div className={`mt-2 p-3 rounded-lg text-sm ${
                  testResult.success && testResult.ok 
                    ? 'bg-emerald-500/20 text-emerald-400' 
                    : 'bg-red-500/20 text-red-400'
                }`}>
                  {testResult.success && testResult.ok ? (
                    <>✓ Connection successful ({testResult.status} - {testResult.responseTime}ms)</>
                  ) : testResult.success ? (
                    <>⚠ Responded with status {testResult.status}</>
                  ) : (
                    <>✕ {testResult.error}</>
                  )}
                </div>
              )}
            </div>
          )}

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
              {service ? 'Save Changes' : 'Create Service'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function GroupModal({ group, onSave, onClose }) {
  const [formData, setFormData] = useState({
    name: group?.name || '',
    description: group?.description || '',
    display_order: group?.display_order || 0
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">
            {group ? 'Edit Group' : 'New Group'}
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
            <label className="block text-sm font-medium text-slate-300 mb-2">Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Display Order</label>
            <input
              type="number"
              value={formData.display_order}
              onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
              {group ? 'Save Changes' : 'Create Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

