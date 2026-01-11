import { useState, useEffect } from 'react'
import api from '../../lib/api'
import { formatDateTime, formatRelativeTime } from '../../lib/utils'

export default function AdminSubscribers() {
  const [subscribers, setSubscribers] = useState([])
  const [services, setServices] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingSubscriber, setEditingSubscriber] = useState(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [subscribersRes, servicesRes, statsRes] = await Promise.all([
        api.getSubscribers(),
        api.getServices(),
        api.getSubscriberStats()
      ])
      setSubscribers(subscribersRes)
      setServices(servicesRes)
      setStats(statsRes)
    } catch (error) {
      console.error('Failed to fetch subscribers:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveSubscriber = async (data) => {
    try {
      if (editingSubscriber?.id) {
        await api.updateSubscriber(editingSubscriber.id, data)
      } else {
        await api.createSubscriber(data)
      }
      setShowModal(false)
      setEditingSubscriber(null)
      fetchData()
    } catch (error) {
      console.error('Failed to save subscriber:', error)
      alert(error.message)
    }
  }

  const handleDeleteSubscriber = async (id) => {
    if (!confirm('Are you sure you want to delete this subscriber?')) return
    try {
      await api.deleteSubscriber(id)
      fetchData()
    } catch (error) {
      console.error('Failed to delete subscriber:', error)
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
          <h1 className="text-2xl font-bold text-white">Subscribers</h1>
          <p className="text-slate-400 mt-1">Manage notification subscribers</p>
        </div>
        <button
          onClick={() => {
            setEditingSubscriber(null)
            setShowModal(true)
          }}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
        >
          + Add Subscriber
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <span className="text-slate-400 text-sm">Total Subscribers</span>
            <p className="text-2xl font-bold text-white mt-1">{stats.total}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <span className="text-slate-400 text-sm">Verified</span>
            <p className="text-2xl font-bold text-emerald-400 mt-1">{stats.verified}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <span className="text-slate-400 text-sm">Email Subscribers</span>
            <p className="text-2xl font-bold text-white mt-1">{stats.email}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <span className="text-slate-400 text-sm">Webhook Subscribers</span>
            <p className="text-2xl font-bold text-white mt-1">{stats.webhook}</p>
          </div>
        </div>
      )}

      {/* Subscribers Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-800 text-left">
              <th className="px-6 py-4 text-sm font-medium text-slate-400">Contact</th>
              <th className="px-6 py-4 text-sm font-medium text-slate-400">Type</th>
              <th className="px-6 py-4 text-sm font-medium text-slate-400">Notify For</th>
              <th className="px-6 py-4 text-sm font-medium text-slate-400">Services</th>
              <th className="px-6 py-4 text-sm font-medium text-slate-400">Status</th>
              <th className="px-6 py-4 text-sm font-medium text-slate-400">Subscribed</th>
              <th className="px-6 py-4 text-sm font-medium text-slate-400"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {subscribers.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                  No subscribers yet
                </td>
              </tr>
            ) : (
              subscribers.map((subscriber) => (
                <tr key={subscriber.id} className="hover:bg-slate-800/50">
                  <td className="px-6 py-4">
                    <span className="text-white font-medium">
                      {subscriber.email || subscriber.webhook_url}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      subscriber.email 
                        ? 'bg-blue-500/20 text-blue-400' 
                        : 'bg-purple-500/20 text-purple-400'
                    }`}>
                      {subscriber.email ? 'Email' : 'Webhook'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-400 text-sm capitalize">
                    {subscriber.notify_type}
                  </td>
                  <td className="px-6 py-4">
                    {subscriber.services && subscriber.services.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {subscriber.services.slice(0, 2).map((name, idx) => (
                          <span key={idx} className="px-2 py-0.5 bg-slate-800 rounded text-xs text-slate-400">
                            {name}
                          </span>
                        ))}
                        {subscriber.services.length > 2 && (
                          <span className="text-xs text-slate-500">+{subscriber.services.length - 2}</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-500 text-sm">All services</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      subscriber.verified
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-amber-500/20 text-amber-400'
                    }`}>
                      {subscriber.verified ? 'Verified' : 'Pending'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-400 text-sm">
                    {formatRelativeTime(subscriber.created_at)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingSubscriber(subscriber)
                          setShowModal(true)
                        }}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteSubscriber(subscriber.id)}
                        className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-lg transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Subscriber Modal */}
      {showModal && (
        <SubscriberModal
          subscriber={editingSubscriber}
          services={services}
          onSave={handleSaveSubscriber}
          onClose={() => {
            setShowModal(false)
            setEditingSubscriber(null)
          }}
        />
      )}
    </div>
  )
}

function SubscriberModal({ subscriber, services, onSave, onClose }) {
  const [formData, setFormData] = useState({
    email: subscriber?.email || '',
    webhook_url: subscriber?.webhook_url || '',
    notify_type: subscriber?.notify_type || 'all',
    verified: subscriber?.verified || false,
    service_ids: subscriber?.service_ids || []
  })
  const [contactType, setContactType] = useState(subscriber?.webhook_url ? 'webhook' : 'email')

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave({
      email: contactType === 'email' ? formData.email : null,
      webhook_url: contactType === 'webhook' ? formData.webhook_url : null,
      notify_type: formData.notify_type,
      verified: formData.verified,
      service_ids: formData.service_ids
    })
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
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">
            {subscriber ? 'Edit Subscriber' : 'Add Subscriber'}
          </h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Contact Type Toggle */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Contact Type</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setContactType('email')}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                  contactType === 'email'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                Email
              </button>
              <button
                type="button"
                onClick={() => setContactType('webhook')}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                  contactType === 'webhook'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                Webhook
              </button>
            </div>
          </div>

          {contactType === 'email' ? (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Email Address *</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="user@example.com"
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Webhook URL *</label>
              <input
                type="url"
                value={formData.webhook_url}
                onChange={(e) => setFormData({ ...formData, webhook_url: e.target.value })}
                placeholder="https://example.com/webhook"
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Notify For</label>
            <select
              value={formData.notify_type}
              onChange={(e) => setFormData({ ...formData, notify_type: e.target.value })}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Updates</option>
              <option value="incidents">Incidents Only</option>
              <option value="maintenance">Maintenance Only</option>
            </select>
          </div>

          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.verified}
                onChange={(e) => setFormData({ ...formData, verified: e.target.checked })}
                className="w-4 h-4 rounded border-slate-600 text-indigo-600 focus:ring-indigo-500 bg-slate-700"
              />
              <span className="text-sm text-slate-300">Verified (skip email verification)</span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Subscribe to Services</label>
            <p className="text-xs text-slate-500 mb-2">Leave empty to subscribe to all services</p>
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
              {subscriber ? 'Save Changes' : 'Add Subscriber'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

