import express from 'express';
import db from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get all service groups with services (public)
router.get('/groups', (req, res) => {
  const groups = db.prepare(`
    SELECT * FROM service_groups ORDER BY display_order, name
  `).all();

  const services = db.prepare(`
    SELECT * FROM services ORDER BY display_order, name
  `).all();

  const result = groups.map(group => ({
    ...group,
    services: services.filter(s => s.group_id === group.id)
  }));

  // Add ungrouped services
  const ungrouped = services.filter(s => !s.group_id);
  if (ungrouped.length > 0) {
    result.push({
      id: null,
      name: 'Other Services',
      description: null,
      services: ungrouped
    });
  }

  res.json(result);
});

// Get all services (public)
router.get('/', (req, res) => {
  const services = db.prepare(`
    SELECT s.*, g.name as group_name
    FROM services s
    LEFT JOIN service_groups g ON s.group_id = g.id
    ORDER BY g.display_order, s.display_order, s.name
  `).all();
  
  res.json(services);
});

// Get service by ID with uptime history (public)
router.get('/:id', (req, res) => {
  const service = db.prepare(`
    SELECT s.*, g.name as group_name
    FROM services s
    LEFT JOIN service_groups g ON s.group_id = g.id
    WHERE s.id = ?
  `).get(req.params.id);

  if (!service) {
    return res.status(404).json({ error: 'Service not found' });
  }

  // Get 90 days of uptime history
  const uptime = db.prepare(`
    SELECT date, uptime_percentage, avg_response_time
    FROM daily_uptime
    WHERE service_id = ?
    ORDER BY date DESC
    LIMIT 90
  `).all(req.params.id);

  res.json({ ...service, uptime_history: uptime.reverse() });
});

// Get uptime for a service (public)
router.get('/:id/uptime', (req, res) => {
  const days = parseInt(req.query.days) || 90;
  const today = new Date().toISOString().split('T')[0];
  
  // Get historical uptime data (excluding today)
  const uptime = db.prepare(`
    SELECT date, uptime_percentage, avg_response_time, total_checks, successful_checks
    FROM daily_uptime
    WHERE service_id = ? AND date != ?
    ORDER BY date DESC
    LIMIT ?
  `).all(req.params.id, today, days - 1);

  // Calculate today's uptime from actual uptime_records
  const todayRecords = db.prepare(`
    SELECT status, response_time
    FROM uptime_records
    WHERE service_id = ? AND date(checked_at) = ?
  `).all(req.params.id, today);

  let todayData = null;
  if (todayRecords.length > 0) {
    const totalChecks = todayRecords.length;
    const successfulChecks = todayRecords.filter(r => r.status === 'operational').length;
    const uptimePercentage = (successfulChecks / totalChecks) * 100;
    const responseTimes = todayRecords.filter(r => r.response_time).map(r => r.response_time);
    const avgResponseTime = responseTimes.length > 0 
      ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
      : null;
    
    todayData = {
      date: today,
      uptime_percentage: uptimePercentage.toFixed(2),
      avg_response_time: avgResponseTime,
      total_checks: totalChecks,
      successful_checks: successfulChecks
    };
  }

  // Combine historical data with today's real-time data
  const allDays = uptime.reverse();
  if (todayData) {
    allDays.push(todayData);
  }

  // Calculate overall uptime percentage
  const totalPercentage = allDays.reduce((sum, day) => sum + parseFloat(day.uptime_percentage), 0);
  const overallUptime = allDays.length > 0 ? (totalPercentage / allDays.length).toFixed(2) : 100;

  res.json({
    overall_uptime: overallUptime,
    days: allDays
  });
});

// ===== ADMIN ROUTES =====

// Create service group
router.post('/groups', authenticateToken, (req, res) => {
  const { name, description, display_order } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  const result = db.prepare(`
    INSERT INTO service_groups (name, description, display_order)
    VALUES (?, ?, ?)
  `).run(name, description || null, display_order || 0);

  const group = db.prepare('SELECT * FROM service_groups WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(group);
});

// Update service group
router.put('/groups/:id', authenticateToken, (req, res) => {
  const { name, description, display_order } = req.body;

  const existing = db.prepare('SELECT * FROM service_groups WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'Group not found' });
  }

  db.prepare(`
    UPDATE service_groups 
    SET name = ?, description = ?, display_order = ?
    WHERE id = ?
  `).run(
    name || existing.name,
    description !== undefined ? description : existing.description,
    display_order !== undefined ? display_order : existing.display_order,
    req.params.id
  );

  const group = db.prepare('SELECT * FROM service_groups WHERE id = ?').get(req.params.id);
  res.json(group);
});

// Delete service group
router.delete('/groups/:id', authenticateToken, (req, res) => {
  const result = db.prepare('DELETE FROM service_groups WHERE id = ?').run(req.params.id);
  
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Group not found' });
  }

  res.json({ message: 'Group deleted successfully' });
});

// Create service
router.post('/', authenticateToken, (req, res) => {
  const { group_id, name, description, status, monitor_type, monitor_url, monitor_interval, display_order } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  const result = db.prepare(`
    INSERT INTO services (group_id, name, description, status, monitor_type, monitor_url, monitor_interval, display_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    group_id || null,
    name,
    description || null,
    status || 'operational',
    monitor_type || 'manual',
    monitor_url || null,
    monitor_interval || 60,
    display_order || 0
  );

  const serviceId = result.lastInsertRowid;

  // Initialize uptime history for the new service (last 89 days at 100%, excluding today)
  // Today's uptime will be calculated from actual monitoring checks
  const insertUptime = db.prepare(`
    INSERT OR IGNORE INTO daily_uptime (service_id, date, uptime_percentage, total_checks, successful_checks)
    VALUES (?, ?, 100, 1, 1)
  `);

  for (let i = 89; i >= 1; i--) {  // Start from 1 to exclude today
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    insertUptime.run(serviceId, dateStr);
  }

  const service = db.prepare('SELECT * FROM services WHERE id = ?').get(serviceId);
  res.status(201).json(service);
});

// Update service
router.put('/:id', authenticateToken, (req, res) => {
  const { group_id, name, description, status, monitor_type, monitor_url, monitor_interval, display_order } = req.body;

  const existing = db.prepare('SELECT * FROM services WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'Service not found' });
  }

  db.prepare(`
    UPDATE services 
    SET group_id = ?, name = ?, description = ?, status = ?, monitor_type = ?, monitor_url = ?, monitor_interval = ?, display_order = ?
    WHERE id = ?
  `).run(
    group_id !== undefined ? group_id : existing.group_id,
    name || existing.name,
    description !== undefined ? description : existing.description,
    status || existing.status,
    monitor_type || existing.monitor_type,
    monitor_url !== undefined ? monitor_url : existing.monitor_url,
    monitor_interval !== undefined ? monitor_interval : existing.monitor_interval,
    display_order !== undefined ? display_order : existing.display_order,
    req.params.id
  );

  const service = db.prepare('SELECT * FROM services WHERE id = ?').get(req.params.id);
  res.json(service);
});

// Delete service
router.delete('/:id', authenticateToken, (req, res) => {
  const result = db.prepare('DELETE FROM services WHERE id = ?').run(req.params.id);
  
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Service not found' });
  }

  res.json({ message: 'Service deleted successfully' });
});

// Update service status (quick update)
router.patch('/:id/status', authenticateToken, (req, res) => {
  const { status } = req.body;

  const validStatuses = ['operational', 'degraded', 'partial_outage', 'major_outage', 'maintenance'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  const result = db.prepare('UPDATE services SET status = ? WHERE id = ?').run(status, req.params.id);
  
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Service not found' });
  }

  const service = db.prepare('SELECT * FROM services WHERE id = ?').get(req.params.id);
  res.json(service);
});

export default router;

