import db from './db.js';

// Run health checks on all services with HTTP monitoring
export async function runMonitorCheck() {
  const services = db.prepare(`
    SELECT id, name, monitor_url, monitor_type 
    FROM services 
    WHERE monitor_type = 'http' AND monitor_url IS NOT NULL AND monitor_url != ''
  `).all();

  for (const service of services) {
    try {
      const startTime = Date.now();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(service.monitor_url, {
        method: 'GET',
        signal: controller.signal
      });

      clearTimeout(timeout);
      const responseTime = Date.now() - startTime;
      const status = response.ok ? 'operational' : 'degraded';

      // Update service status
      db.prepare('UPDATE services SET status = ?, last_check = CURRENT_TIMESTAMP WHERE id = ?')
        .run(status, service.id);

      // Record uptime entry
      db.prepare('INSERT INTO uptime_records (service_id, status, response_time) VALUES (?, ?, ?)')
        .run(service.id, status, responseTime);

    } catch (error) {
      // Service is down or unreachable
      db.prepare('UPDATE services SET status = ?, last_check = CURRENT_TIMESTAMP WHERE id = ?')
        .run('major_outage', service.id);

      db.prepare('INSERT INTO uptime_records (service_id, status, response_time) VALUES (?, ?, ?)')
        .run(service.id, 'major_outage', null);
    }
  }
}

// Calculate and store daily uptime summary
export function calculateDailyUptime() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const dateStr = yesterday.toISOString().split('T')[0];

  const services = db.prepare('SELECT id FROM services').all();

  for (const service of services) {
    const records = db.prepare(`
      SELECT status, response_time
      FROM uptime_records
      WHERE service_id = ? AND date(checked_at) = ?
    `).all(service.id, dateStr);

    if (records.length === 0) continue;

    const totalChecks = records.length;
    const successfulChecks = records.filter(r => r.status === 'operational').length;
    const uptimePercentage = (successfulChecks / totalChecks) * 100;
    
    const responseTimes = records.filter(r => r.response_time).map(r => r.response_time);
    const avgResponseTime = responseTimes.length > 0 
      ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
      : null;

    db.prepare(`
      INSERT OR REPLACE INTO daily_uptime 
      (service_id, date, uptime_percentage, total_checks, successful_checks, avg_response_time)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(service.id, dateStr, uptimePercentage.toFixed(2), totalChecks, successfulChecks, avgResponseTime);
  }

  // Clean up old uptime records (keep last 7 days of detailed records)
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  db.prepare('DELETE FROM uptime_records WHERE checked_at < ?').run(weekAgo.toISOString());
}

