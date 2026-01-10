import express from 'express';
import db from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get all incidents (public) - with optional filters
router.get('/', (req, res) => {
  const { status, limit, include_resolved, scheduled } = req.query;
  
  let query = `
    SELECT i.*, 
      GROUP_CONCAT(s.id) as service_ids,
      GROUP_CONCAT(s.name) as service_names
    FROM incidents i
    LEFT JOIN incident_services is_link ON i.id = is_link.incident_id
    LEFT JOIN services s ON is_link.service_id = s.id
  `;
  
  const conditions = [];
  const params = [];

  if (scheduled === 'true') {
    conditions.push('i.is_scheduled = 1');
  } else if (scheduled === 'false') {
    conditions.push('i.is_scheduled = 0');
  }

  if (status) {
    conditions.push('i.status = ?');
    params.push(status);
  }

  if (include_resolved !== 'true') {
    conditions.push("i.status != 'resolved'");
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' GROUP BY i.id ORDER BY i.created_at DESC';

  if (limit) {
    query += ' LIMIT ?';
    params.push(parseInt(limit));
  }

  const incidents = db.prepare(query).all(...params);

  // Parse the concatenated service data
  const result = incidents.map(incident => ({
    ...incident,
    affected_services: incident.service_ids
      ? incident.service_ids.split(',').map((id, idx) => ({
          id: parseInt(id),
          name: incident.service_names.split(',')[idx]
        }))
      : [],
    service_ids: undefined,
    service_names: undefined
  }));

  res.json(result);
});

// Get active incidents (public)
router.get('/active', (req, res) => {
  const incidents = db.prepare(`
    SELECT i.*, 
      GROUP_CONCAT(s.id) as service_ids,
      GROUP_CONCAT(s.name) as service_names
    FROM incidents i
    LEFT JOIN incident_services is_link ON i.id = is_link.incident_id
    LEFT JOIN services s ON is_link.service_id = s.id
    WHERE i.status != 'resolved' AND i.is_scheduled = 0
    GROUP BY i.id
    ORDER BY i.created_at DESC
  `).all();

  const result = incidents.map(incident => ({
    ...incident,
    affected_services: incident.service_ids
      ? incident.service_ids.split(',').map((id, idx) => ({
          id: parseInt(id),
          name: incident.service_names.split(',')[idx]
        }))
      : []
  }));

  res.json(result);
});

// Get upcoming scheduled maintenance (public)
router.get('/scheduled', (req, res) => {
  const incidents = db.prepare(`
    SELECT i.*, 
      GROUP_CONCAT(s.id) as service_ids,
      GROUP_CONCAT(s.name) as service_names
    FROM incidents i
    LEFT JOIN incident_services is_link ON i.id = is_link.incident_id
    LEFT JOIN services s ON is_link.service_id = s.id
    WHERE i.is_scheduled = 1 AND (i.status != 'resolved' OR i.scheduled_for > datetime('now'))
    GROUP BY i.id
    ORDER BY i.scheduled_for ASC
  `).all();

  const result = incidents.map(incident => ({
    ...incident,
    affected_services: incident.service_ids
      ? incident.service_ids.split(',').map((id, idx) => ({
          id: parseInt(id),
          name: incident.service_names.split(',')[idx]
        }))
      : []
  }));

  res.json(result);
});

// Get incident by ID with updates (public)
router.get('/:id', (req, res) => {
  const incident = db.prepare(`
    SELECT i.*, 
      GROUP_CONCAT(s.id) as service_ids,
      GROUP_CONCAT(s.name) as service_names
    FROM incidents i
    LEFT JOIN incident_services is_link ON i.id = is_link.incident_id
    LEFT JOIN services s ON is_link.service_id = s.id
    WHERE i.id = ?
    GROUP BY i.id
  `).get(req.params.id);

  if (!incident) {
    return res.status(404).json({ error: 'Incident not found' });
  }

  const updates = db.prepare(`
    SELECT * FROM incident_updates
    WHERE incident_id = ?
    ORDER BY created_at DESC
  `).all(req.params.id);

  res.json({
    ...incident,
    affected_services: incident.service_ids
      ? incident.service_ids.split(',').map((id, idx) => ({
          id: parseInt(id),
          name: incident.service_names.split(',')[idx]
        }))
      : [],
    updates
  });
});

// Get incident history (public) - resolved incidents for the past X days
router.get('/history/:days', (req, res) => {
  const days = parseInt(req.params.days) || 7;
  
  const incidents = db.prepare(`
    SELECT i.*, 
      GROUP_CONCAT(DISTINCT s.id) as service_ids,
      GROUP_CONCAT(DISTINCT s.name) as service_names
    FROM incidents i
    LEFT JOIN incident_services is_link ON i.id = is_link.incident_id
    LEFT JOIN services s ON is_link.service_id = s.id
    WHERE i.created_at >= datetime('now', '-' || ? || ' days')
    GROUP BY i.id
    ORDER BY i.created_at DESC
  `).all(days);

  const result = incidents.map(incident => ({
    ...incident,
    affected_services: incident.service_ids
      ? incident.service_ids.split(',').map((id, idx) => ({
          id: parseInt(id),
          name: incident.service_names.split(',')[idx]
        }))
      : []
  }));

  res.json(result);
});

// ===== ADMIN ROUTES =====

// Create incident
router.post('/', authenticateToken, (req, res) => {
  const { title, status, impact, message, service_ids, is_scheduled, scheduled_for, scheduled_until } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }

  const result = db.prepare(`
    INSERT INTO incidents (title, status, impact, is_scheduled, scheduled_for, scheduled_until)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    title,
    status || 'investigating',
    impact || 'minor',
    is_scheduled ? 1 : 0,
    scheduled_for || null,
    scheduled_until || null
  );

  const incidentId = result.lastInsertRowid;

  // Add initial update if message provided
  if (message) {
    db.prepare(`
      INSERT INTO incident_updates (incident_id, status, message)
      VALUES (?, ?, ?)
    `).run(incidentId, status || 'investigating', message);
  }

  // Link affected services
  if (service_ids && service_ids.length > 0) {
    const insertLink = db.prepare('INSERT INTO incident_services (incident_id, service_id) VALUES (?, ?)');
    for (const serviceId of service_ids) {
      insertLink.run(incidentId, serviceId);
    }
  }

  const incident = db.prepare('SELECT * FROM incidents WHERE id = ?').get(incidentId);
  res.status(201).json(incident);
});

// Update incident
router.put('/:id', authenticateToken, (req, res) => {
  const { title, status, impact, is_scheduled, scheduled_for, scheduled_until, service_ids } = req.body;

  const existing = db.prepare('SELECT * FROM incidents WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'Incident not found' });
  }

  // Update resolved_at if status changed to resolved
  let resolved_at = existing.resolved_at;
  if (status === 'resolved' && existing.status !== 'resolved') {
    resolved_at = new Date().toISOString();
  } else if (status !== 'resolved') {
    resolved_at = null;
  }

  db.prepare(`
    UPDATE incidents 
    SET title = ?, status = ?, impact = ?, is_scheduled = ?, scheduled_for = ?, scheduled_until = ?, resolved_at = ?
    WHERE id = ?
  `).run(
    title || existing.title,
    status || existing.status,
    impact || existing.impact,
    is_scheduled !== undefined ? (is_scheduled ? 1 : 0) : existing.is_scheduled,
    scheduled_for !== undefined ? scheduled_for : existing.scheduled_for,
    scheduled_until !== undefined ? scheduled_until : existing.scheduled_until,
    resolved_at,
    req.params.id
  );

  // Update linked services if provided
  if (service_ids !== undefined) {
    db.prepare('DELETE FROM incident_services WHERE incident_id = ?').run(req.params.id);
    const insertLink = db.prepare('INSERT INTO incident_services (incident_id, service_id) VALUES (?, ?)');
    for (const serviceId of service_ids) {
      insertLink.run(req.params.id, serviceId);
    }
  }

  const incident = db.prepare('SELECT * FROM incidents WHERE id = ?').get(req.params.id);
  res.json(incident);
});

// Add update to incident
router.post('/:id/updates', authenticateToken, (req, res) => {
  const { status, message } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  const incident = db.prepare('SELECT * FROM incidents WHERE id = ?').get(req.params.id);
  if (!incident) {
    return res.status(404).json({ error: 'Incident not found' });
  }

  // Insert the update
  const result = db.prepare(`
    INSERT INTO incident_updates (incident_id, status, message)
    VALUES (?, ?, ?)
  `).run(req.params.id, status || incident.status, message);

  // Update incident status if provided
  if (status && status !== incident.status) {
    let resolved_at = null;
    if (status === 'resolved') {
      resolved_at = new Date().toISOString();
    }
    
    db.prepare('UPDATE incidents SET status = ?, resolved_at = ? WHERE id = ?')
      .run(status, resolved_at, req.params.id);
  }

  const update = db.prepare('SELECT * FROM incident_updates WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(update);
});

// Delete incident
router.delete('/:id', authenticateToken, (req, res) => {
  const result = db.prepare('DELETE FROM incidents WHERE id = ?').run(req.params.id);
  
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Incident not found' });
  }

  res.json({ message: 'Incident deleted successfully' });
});

// Delete incident update
router.delete('/:id/updates/:updateId', authenticateToken, (req, res) => {
  const result = db.prepare('DELETE FROM incident_updates WHERE id = ? AND incident_id = ?')
    .run(req.params.updateId, req.params.id);
  
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Update not found' });
  }

  res.json({ message: 'Update deleted successfully' });
});

export default router;

