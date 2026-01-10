import express from 'express';
import db from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get public settings
router.get('/', (req, res) => {
  const settings = db.prepare('SELECT key, value FROM settings').all();
  const result = {};
  for (const setting of settings) {
    result[setting.key] = setting.value;
  }
  res.json(result);
});

// Get overall system status (public)
router.get('/status', (req, res) => {
  const services = db.prepare('SELECT status FROM services').all();
  
  const statusCounts = {
    operational: 0,
    degraded: 0,
    partial_outage: 0,
    major_outage: 0,
    maintenance: 0
  };

  for (const service of services) {
    if (statusCounts[service.status] !== undefined) {
      statusCounts[service.status]++;
    }
  }

  let overallStatus = 'operational';
  let statusMessage = 'All systems operational';

  if (statusCounts.major_outage > 0) {
    overallStatus = 'major_outage';
    statusMessage = 'Major system outage';
  } else if (statusCounts.partial_outage > 0) {
    overallStatus = 'partial_outage';
    statusMessage = 'Partial system outage';
  } else if (statusCounts.degraded > 0) {
    overallStatus = 'degraded';
    statusMessage = 'Some systems experiencing issues';
  } else if (statusCounts.maintenance > 0) {
    overallStatus = 'maintenance';
    statusMessage = 'Scheduled maintenance in progress';
  }

  // Get active incidents count
  const activeIncidents = db.prepare(`
    SELECT COUNT(*) as count FROM incidents 
    WHERE status != 'resolved' AND is_scheduled = 0
  `).get();

  res.json({
    status: overallStatus,
    message: statusMessage,
    services: statusCounts,
    total_services: services.length,
    active_incidents: activeIncidents.count
  });
});

// ===== ADMIN ROUTES =====

// Update setting
router.put('/:key', authenticateToken, (req, res) => {
  const { value } = req.body;
  
  db.prepare(`
    INSERT INTO settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(req.params.key, value);

  res.json({ key: req.params.key, value });
});

// Bulk update settings
router.put('/', authenticateToken, (req, res) => {
  const settings = req.body;
  
  const update = db.prepare(`
    INSERT INTO settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `);

  for (const [key, value] of Object.entries(settings)) {
    update.run(key, value);
  }

  res.json(settings);
});

export default router;

