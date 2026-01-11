import { useState, useEffect } from 'react'
import api from '../../lib/api'

export default function MetricsDisplay() {
  const [metrics, setMetrics] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMetrics()
  }, [])

  const fetchMetrics = async () => {
    try {
      const data = await api.getMetrics()
      // Only show metrics that have display_chart enabled
      setMetrics(data.filter(m => m.display_chart))
    } catch (error) {
      console.error('Failed to fetch metrics:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading || metrics.length === 0) return null

  return (
    <section className="mb-12 animate-slide-up">
      <h2 className="text-lg font-semibold text-slate-300 mb-6 flex items-center gap-2">
        <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
        System Metrics
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {metrics.map((metric) => (
          <MetricCard key={metric.id} metric={metric} />
        ))}
      </div>
    </section>
  )
}

function MetricCard({ metric }) {
  const [data, setData] = useState(null)

  useEffect(() => {
    fetchData()
  }, [metric.id])

  const fetchData = async () => {
    try {
      const result = await api.getMetric(metric.id, 24)
      setData(result)
    } catch (error) {
      console.error('Failed to fetch metric data:', error)
    }
  }

  return (
    <div className="glass rounded-xl p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-medium text-white">{metric.name}</h3>
          {metric.description && (
            <p className="text-slate-500 text-sm">{metric.description}</p>
          )}
        </div>
        <div className="text-right">
          <span className="text-2xl font-bold text-indigo-400">
            {data?.stats?.latest !== null ? data.stats.latest.toFixed(1) : '—'}
          </span>
          {metric.suffix && (
            <span className="text-slate-400 ml-1">{metric.suffix}</span>
          )}
        </div>
      </div>

      {/* Mini Chart */}
      {data?.points && data.points.length > 1 && (
        <div className="h-16 mt-3">
          <MiniChart data={data.points} />
        </div>
      )}

      {/* Stats */}
      {data?.stats && (
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5 text-xs text-slate-500">
          <span>Min: {data.stats.min?.toFixed(1)}{metric.suffix}</span>
          <span>Avg: {data.stats.avg?.toFixed(1)}{metric.suffix}</span>
          <span>Max: {data.stats.max?.toFixed(1)}{metric.suffix}</span>
        </div>
      )}
    </div>
  )
}

function MiniChart({ data }) {
  if (!data || data.length < 2) return null

  const values = data.map(d => d.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1

  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * 100
    const y = 100 - ((d.value - min) / range) * 80 - 10
    return `${x},${y}`
  }).join(' ')

  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
      <defs>
        <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="rgb(99, 102, 241)" stopOpacity="0.2" />
          <stop offset="100%" stopColor="rgb(99, 102, 241)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={`0,100 ${points} 100,100`}
        fill="url(#chartGradient)"
      />
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

