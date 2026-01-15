import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import api from '../../lib/api'

export default function AdminSettings() {
  const { user } = useAuth()
  const [settings, setSettings] = useState({
    site_name: '',
    site_description: '',
    timezone: 'UTC',
    mattermost_webhook_url: '',
    mattermost_channel: '',
    mattermost_username: 'Staytus',
    mattermost_notifications_enabled: 'false'
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState(null)
  const [testingWebhook, setTestingWebhook] = useState(false)
  const [webhookTestResult, setWebhookTestResult] = useState(null)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const data = await api.getSettings()
      setSettings(data)
    } catch (error) {
      console.error('Failed to fetch settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveSettings = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    try {
      await api.updateSettings(settings)
      setMessage({ type: 'success', text: 'Settings saved successfully!' })
    } catch (error) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setSaving(false)
    }
  }

  const handleTestWebhook = async () => {
    if (!settings.mattermost_webhook_url) return
    setTestingWebhook(true)
    setWebhookTestResult(null)
    try {
      const response = await fetch('/api/settings/test-mattermost', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('staytus_token')}`
        },
        body: JSON.stringify({
          webhook_url: settings.mattermost_webhook_url,
          channel: settings.mattermost_channel,
          username: settings.mattermost_username
        })
      })
      const data = await response.json()
      if (data.success) {
        setWebhookTestResult({ type: 'success', text: 'Test message sent successfully!' })
      } else {
        setWebhookTestResult({ type: 'error', text: data.error || 'Failed to send test message' })
      }
    } catch (error) {
      setWebhookTestResult({ type: 'error', text: error.message })
    } finally {
      setTestingWebhook(false)
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'Passwords do not match' })
      return
    }

    if (passwordForm.newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: 'Password must be at least 6 characters' })
      return
    }

    setPasswordSaving(true)
    setPasswordMessage(null)

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('staytus_token')}`
        },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error)
      }

      setPasswordMessage({ type: 'success', text: 'Password changed successfully!' })
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (error) {
      setPasswordMessage({ type: 'error', text: error.message })
    } finally {
      setPasswordSaving(false)
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
    <div className="p-8 max-w-3xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-slate-400 mt-1">Configure your status page</p>
      </div>

      {/* Site Settings */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-slate-800">
          <h2 className="font-semibold text-white">Site Settings</h2>
        </div>
        <form onSubmit={handleSaveSettings} className="p-6 space-y-4">
          {message && (
            <div className={`p-4 rounded-lg ${
              message.type === 'success' 
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                : 'bg-red-500/10 text-red-400 border border-red-500/20'
            }`}>
              {message.text}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Site Name</label>
            <input
              type="text"
              value={settings.site_name || ''}
              onChange={(e) => setSettings({ ...settings, site_name: e.target.value })}
              placeholder="System Status"
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Site Description</label>
            <textarea
              value={settings.site_description || ''}
              onChange={(e) => setSettings({ ...settings, site_description: e.target.value })}
              placeholder="Current status of our services and infrastructure"
              rows={3}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Timezone</label>
            <select
              value={settings.timezone || 'UTC'}
              onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="UTC">UTC</option>
              <option value="America/New_York">Eastern Time</option>
              <option value="America/Chicago">Central Time</option>
              <option value="America/Denver">Mountain Time</option>
              <option value="America/Los_Angeles">Pacific Time</option>
              <option value="Europe/London">London</option>
              <option value="Europe/Paris">Paris</option>
              <option value="Europe/Berlin">Berlin</option>
              <option value="Europe/Oslo">Oslo</option>
              <option value="Asia/Tokyo">Tokyo</option>
              <option value="Asia/Shanghai">Shanghai</option>
              <option value="Australia/Sydney">Sydney</option>
            </select>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>

      {/* Mattermost Integration */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-slate-800">
          <h2 className="font-semibold text-white">Mattermost Notifications</h2>
          <p className="text-slate-400 text-sm mt-1">Get notified in Mattermost when services go down</p>
        </div>
        <div className="p-6 space-y-4">
          {webhookTestResult && (
            <div className={`p-4 rounded-lg ${
              webhookTestResult.type === 'success' 
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                : 'bg-red-500/10 text-red-400 border border-red-500/20'
            }`}>
              {webhookTestResult.text}
            </div>
          )}

          <div className="flex items-center gap-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.mattermost_notifications_enabled === 'true'}
                onChange={(e) => setSettings({ ...settings, mattermost_notifications_enabled: e.target.checked ? 'true' : 'false' })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
            <span className="text-sm font-medium text-slate-300">Enable Mattermost notifications</span>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Webhook URL *</label>
            <input
              type="url"
              value={settings.mattermost_webhook_url || ''}
              onChange={(e) => setSettings({ ...settings, mattermost_webhook_url: e.target.value })}
              placeholder="https://mattermost.example.com/hooks/xxx-xxx-xxx"
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-slate-500 text-xs mt-1">Create an incoming webhook in Mattermost and paste the URL here</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Channel (optional)</label>
            <input
              type="text"
              value={settings.mattermost_channel || ''}
              onChange={(e) => setSettings({ ...settings, mattermost_channel: e.target.value })}
              placeholder="town-square"
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-slate-500 text-xs mt-1">Override the default channel (leave empty to use webhook default)</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Bot Username</label>
            <input
              type="text"
              value={settings.mattermost_username || 'Staytus'}
              onChange={(e) => setSettings({ ...settings, mattermost_username: e.target.value })}
              placeholder="Staytus"
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleTestWebhook}
              disabled={testingWebhook || !settings.mattermost_webhook_url}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {testingWebhook ? 'Sending...' : 'Send Test Message'}
            </button>
          </div>
        </div>
      </div>

      {/* Password Change */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-slate-800">
          <h2 className="font-semibold text-white">Change Password</h2>
        </div>
        <form onSubmit={handleChangePassword} className="p-6 space-y-4">
          {passwordMessage && (
            <div className={`p-4 rounded-lg ${
              passwordMessage.type === 'success' 
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                : 'bg-red-500/10 text-red-400 border border-red-500/20'
            }`}>
              {passwordMessage.text}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Current Password</label>
            <input
              type="password"
              value={passwordForm.currentPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">New Password</label>
            <input
              type="password"
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Confirm New Password</label>
            <input
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={passwordSaving}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {passwordSaving ? 'Changing...' : 'Change Password'}
            </button>
          </div>
        </form>
      </div>

      {/* Account Info */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800">
          <h2 className="font-semibold text-white">Account</h2>
        </div>
        <div className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <span className="text-2xl font-bold text-white">
                {user?.username?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <p className="text-lg font-medium text-white">{user?.username}</p>
              <p className="text-slate-400">{user?.email}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

