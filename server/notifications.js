import db from './db.js';

// Get a setting value from the database
function getSetting(key) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row?.value || null;
}

// Send notification to Mattermost
export async function sendMattermostNotification(message, options = {}) {
  const webhookUrl = getSetting('mattermost_webhook_url');
  const enabled = getSetting('mattermost_notifications_enabled');
  
  if (!webhookUrl || enabled !== 'true') {
    return { success: false, error: 'Mattermost notifications not configured or disabled' };
  }

  const channel = options.channel || getSetting('mattermost_channel');
  const username = options.username || getSetting('mattermost_username') || 'Staytus';

  const payload = {
    text: message,
    username: username,
    icon_url: 'https://raw.githubusercontent.com/status-page/staytus/main/public/favicon.svg'
  };

  if (channel) {
    payload.channel = channel;
  }

  // Support for attachments (rich formatting)
  if (options.attachments) {
    payload.attachments = options.attachments;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const text = await response.text();
      return { success: false, error: `Mattermost returned ${response.status}: ${text}` };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Send a test notification
export async function sendTestNotification(webhookUrl, channel, username) {
  const payload = {
    text: '✅ **Test notification from Staytus**\n\nYour Mattermost integration is working correctly!',
    username: username || 'Staytus',
    icon_url: 'https://raw.githubusercontent.com/status-page/staytus/main/public/favicon.svg'
  };

  if (channel) {
    payload.channel = channel;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const text = await response.text();
      return { success: false, error: `Mattermost returned ${response.status}: ${text}` };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Send service status change notification
export async function notifyServiceStatusChange(service, oldStatus, newStatus) {
  const statusEmoji = {
    operational: '✅',
    degraded: '⚠️',
    partial_outage: '🟠',
    major_outage: '🔴',
    maintenance: '🔧'
  };

  const statusLabels = {
    operational: 'Operational',
    degraded: 'Degraded Performance',
    partial_outage: 'Partial Outage',
    major_outage: 'Major Outage',
    maintenance: 'Under Maintenance'
  };

  const emoji = statusEmoji[newStatus] || '❓';
  const label = statusLabels[newStatus] || newStatus;
  const oldLabel = statusLabels[oldStatus] || oldStatus;

  // Determine color for attachment
  const color = {
    operational: '#22c55e',
    degraded: '#eab308',
    partial_outage: '#f97316',
    major_outage: '#ef4444',
    maintenance: '#6366f1'
  }[newStatus] || '#64748b';

  const isRecovery = newStatus === 'operational' && oldStatus !== 'operational';
  const title = isRecovery 
    ? `${emoji} Service Recovered: ${service.name}`
    : `${emoji} Service Status Change: ${service.name}`;

  const message = isRecovery
    ? `**${service.name}** is now operational again.`
    : `**${service.name}** status changed from ${oldLabel} to **${label}**.`;

  return sendMattermostNotification(message, {
    attachments: [{
      fallback: `${service.name}: ${label}`,
      color: color,
      title: title,
      text: service.description || '',
      fields: [
        {
          short: true,
          title: 'Previous Status',
          value: oldLabel
        },
        {
          short: true,
          title: 'Current Status',
          value: label
        }
      ],
      footer: 'Staytus Status Monitor',
      ts: Math.floor(Date.now() / 1000)
    }]
  });
}

// Send incident notification
export async function notifyIncident(incident, type = 'created') {
  const impactEmoji = {
    none: 'ℹ️',
    minor: '⚠️',
    major: '🟠',
    critical: '🔴'
  };

  const emoji = impactEmoji[incident.impact] || '❓';
  
  let title, message;
  
  if (type === 'created') {
    title = `${emoji} New Incident: ${incident.title}`;
    message = `A new incident has been reported.`;
  } else if (type === 'updated') {
    title = `${emoji} Incident Updated: ${incident.title}`;
    message = `The incident has been updated.`;
  } else if (type === 'resolved') {
    title = `✅ Incident Resolved: ${incident.title}`;
    message = `The incident has been resolved.`;
  }

  const color = {
    none: '#64748b',
    minor: '#eab308',
    major: '#f97316',
    critical: '#ef4444'
  }[incident.impact] || '#64748b';

  return sendMattermostNotification(message, {
    attachments: [{
      fallback: title,
      color: type === 'resolved' ? '#22c55e' : color,
      title: title,
      fields: [
        {
          short: true,
          title: 'Status',
          value: incident.status
        },
        {
          short: true,
          title: 'Impact',
          value: incident.impact
        }
      ],
      footer: 'Staytus Status Monitor',
      ts: Math.floor(Date.now() / 1000)
    }]
  });
}
