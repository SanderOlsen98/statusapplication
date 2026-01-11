import { useState, useEffect } from 'react'
import api from '../../lib/api'
import { formatDateTime } from '../../lib/utils'

export default function AdminMetrics() {
  const [metrics, setMetrics] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showPointModal, setShowPointModal] = useState(null)
  const [editingMetric, setEditingMetric] = useState(null)
  const [selectedMetric, setSelectedMetric] = useState(null)
  const [metricData, setMetricData] = useState(null)
  const [timeRange, setTimeRange] = useState('24')

  useEffect(() => {
    fetchMetrics()
  }, [])

  useEffect(() => {
    if (selectedMetric) {
      fetchMetricData(selectedMetric.id)
    }
  }, [selectedMetric, timeRange])

  const fetchMetrics = async () => {
    try {
      const data = await api.getMetrics()
      setMetrics(data)
      if (data.length > 0 && !selectedMetric) {
        setSelectedMetric(data[0])
      }
    } catch (error) {
      console.error('Failed to fetch metrics:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchMetricData = async (id) => {
    try {
      const data = await api.getMetric(id, parseInt(timeRange))
      setMetricData(data)
    } catch (error) {
      console.error('Failed to fetch metric data:', error)
    }
  }

  const handleSaveMetric = async (data) => {
    try {
      if (editingMetric?.id) {
        await api.updateMetric(editingMetric.id, data)
      } else {
        await api.createMetric(data)
      }
      setShowModal(false)
      setEditingMetric(null)
      fetchMetrics()
    } catch (error) {
      console.error('Failed to save metric:', error)
      alert(error.message)
    }
  }

  const handleDeleteMetric = async (id) => {
    if (!confirm('Are you sure you want to delete this metric?')) return
    try {
      await api.deleteMetric(id)
      if (selectedMetric?.id === id) {
        setSelectedMetric(null)
        setMetricData(null)
      }
      fetchMetrics()
    } catch (error) {
      console.error('Failed to delete metric:', error)
    }
  }

  const handleAddPoint = async (data) => {
    try {
      await api.addMetricPoint(showPointModal, data.value, data.recorded_at)
      setShowPointModal(null)
      if (selectedMetric?.id === showPointModal) {
        fetchMetricData(showPointModal)
      }
      fetchMetrics()
    } catch (error) {
      console.error('Failed to add point:', error)
      alert(error.message)
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
          <h1 className="text-2xl font-bold text-white">Metrics</h1>
          <p className="text-slate-400 mt-1">Track and display custom metrics</p>
        </div>
        <button
          onClick={() => {
            setEditingMetric(null)
            setShowModal(true)
          }}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
        >
          + New Metric
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Metrics List */}
        <div className="lg:col-span-1 space-y-4">
          {metrics.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
              <div className="text-4xl mb-3">📊</div>
              <p className="text-slate-400">No metrics created yet</p>
              <button
                onClick={() => setShowModal(true)}
                className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
              >
                Create Metric
              </button>
            </div>
          ) : (
            metrics.map((metric) => (
              <div
                key={metric.id}
                onClick={() => setSelectedMetric(metric)}
                className={`bg-slate-900 border rounded-xl p-4 cursor-pointer transition-all ${
                  selectedMetric?.id === metric.id
                    ? 'border-indigo-500 ring-1 ring-indigo-500'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-white">{metric.name}</h3>
                    {metric.description && (
                      <p className="text-slate-500 text-sm mt-1">{metric.description}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-indigo-400">
                      {metric.latest_value !== null ? metric.latest_value.toFixed(2) : '—'}
                    </span>
                    {metric.suffix && (
                      <span className="text-slate-500 ml-1">{metric.suffix}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowPointModal(metric.id)
                    }}
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded transition-colors"
                  >
                    + Add Point
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setEditingMetric(metric)
                      setShowModal(true)
                    }}
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteMetric(metric.id)
                    }}
                    className="px-2 py-1 bg-slate-800 hover:bg-red-600 text-slate-300 text-xs rounded transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Metric Detail / Chart */}
        <div className="lg:col-span-2">
          {selectedMetric && metricData ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-white">{metricData.name}</h2>
                  {metricData.description && (
                    <p className="text-slate-500 text-sm">{metricData.description}</p>
                  )}
                </div>
                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white"
                >
                  <option value="1">Last hour</option>
                  <option value="6">Last 6 hours</option>
                  <option value="24">Last 24 hours</option>
                  <option value="168">Last 7 days</option>
                  <option value="720">Last 30 days</option>
                </select>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-4 gap-4 p-6 border-b border-slate-800">
                <div className="text-center">
                  <span className="text-slate-500 text-sm block">Current</span>
                  <span className="text-xl font-bold text-white">
                    {metricData.stats.latest?.toFixed(2) || '—'}{metricData.suffix}
                  </span>
                </div>
                <div className="text-center">
                  <span className="text-slate-500 text-sm block">Average</span>
                  <span className="text-xl font-bold text-white">
                    {metricData.stats.avg?.toFixed(2) || '—'}{metricData.suffix}
                  </span>
                </div>
                <div className="text-center">
                  <span className="text-slate-500 text-sm block">Min</span>
                  <span className="text-xl font-bold text-emerald-400">
                    {metricData.stats.min?.toFixed(2) || '—'}{metricData.suffix}
                  </span>
                </div>
                <div className="text-center">
                  <span className="text-slate-500 text-sm block">Max</span>
                  <span className="text-xl font-bold text-red-400">
                    {metricData.stats.max?.toFixed(2) || '—'}{metricData.suffix}
                  </span>
                </div>
              </div>

              {/* Simple Chart */}
              <div className="p-6">
                {metricData.points.length > 0 ? (
                  <div className="h-48">
                    <SimpleLineChart 
                      data={metricData.points} 
                      suffix={metricData.suffix}
                    />
                  </div>
                ) : (
                  <div className="h-48 flex items-center justify-center text-slate-500">
                    No data points in this time range
                  </div>
                )}
              </div>

              {/* Recent Points */}
              <div className="px-6 pb-6">
                <h3 className="text-sm font-medium text-slate-400 mb-3">Recent Data Points</h3>
                <div className="max-h-40 overflow-y-auto space-y-2">
                  {metricData.points.slice(-10).reverse().map((point, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm py-2 border-b border-slate-800">
                      <span className="text-slate-400">{formatDateTime(point.recorded_at)}</span>
                      <span className="font-mono text-white">{point.value}{metricData.suffix}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
              <p className="text-slate-500">Select a metric to view details</p>
            </div>
          )}
        </div>
      </div>

      {/* Metric Modal */}
      {showModal && (
        <MetricModal
          metric={editingMetric}
          onSave={handleSaveMetric}
          onClose={() => {
            setShowModal(false)
            setEditingMetric(null)
          }}
        />
      )}

      {/* Add Point Modal */}
      {showPointModal && (
        <AddPointModal
          onSave={handleAddPoint}
          onClose={() => setShowPointModal(null)}
        />
      )}
    </div>
  )
}

function SimpleLineChart({ data, suffix }) {
  if (!data || data.length === 0) return null

  const values = data.map(d => d.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1

  const points = data.map((d, i) => {
    const x = (i / (data.length - 1 || 1)) * 100
    const y = 100 - ((d.value - min) / range) * 80 - 10
    return `${x},${y}`
  }).join(' ')

  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
      <defs>
        <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="rgb(99, 102, 241)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="rgb(99, 102, 241)" stopOpacity="0" />
        </linearGradient>
      </defs>
      
      {/* Area fill */}
      <polygon
        points={`0,100 ${points} 100,100`}
        fill="url(#lineGradient)"
      />
      
      {/* Line */}
      <polyline
        points={points}
        fill="none"
        stroke="rgb(99, 102, 241)"
        strokeWidth="0.5"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

function MetricModal({ metric, onSave, onClose }) {
  const [formData, setFormData] = useState({
    name: metric?.name || '',
    suffix: metric?.suffix || '',
    description: metric?.description || '',
    display_chart: metric?.display_chart !== 0,
    default_value: metric?.default_value || '',
    calc_type: metric?.calc_type || 'average'
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave({
      ...formData,
      default_value: formData.default_value ? parseFloat(formData.default_value) : null
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">
            {metric ? 'Edit Metric' : 'New Metric'}
          </h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg">
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
              placeholder="Response Time"
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Suffix</label>
            <input
              type="text"
              value={formData.suffix}
              onChange={(e) => setFormData({ ...formData, suffix: e.target.value })}
              placeholder="ms"
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Average API response time"
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Calculation Type</label>
            <select
              value={formData.calc_type}
              onChange={(e) => setFormData({ ...formData, calc_type: e.target.value })}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="average">Average</option>
              <option value="sum">Sum</option>
              <option value="latest">Latest Value</option>
            </select>
          </div>

          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.display_chart}
                onChange={(e) => setFormData({ ...formData, display_chart: e.target.checked })}
                className="w-4 h-4 rounded border-slate-600 text-indigo-600 focus:ring-indigo-500 bg-slate-700"
              />
              <span className="text-sm text-slate-300">Display chart on status page</span>
            </label>
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
              {metric ? 'Save Changes' : 'Create Metric'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function AddPointModal({ onSave, onClose }) {
  const [formData, setFormData] = useState({
    value: '',
    recorded_at: new Date().toISOString().slice(0, 16)
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave({
      value: parseFloat(formData.value),
      recorded_at: formData.recorded_at ? new Date(formData.recorded_at).toISOString() : null
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-sm">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Add Data Point</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Value *</label>
            <input
              type="number"
              step="any"
              value={formData.value}
              onChange={(e) => setFormData({ ...formData, value: e.target.value })}
              placeholder="123.45"
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Timestamp</label>
            <input
              type="datetime-local"
              value={formData.recorded_at}
              onChange={(e) => setFormData({ ...formData, recorded_at: e.target.value })}
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
              Add Point
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

