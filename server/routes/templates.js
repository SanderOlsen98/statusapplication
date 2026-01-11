import express from 'express';
import db from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get all templates (admin only)
router.get('/', authenticateToken, (req, res) => {
  const templates = db.prepare(`
    SELECT * FROM incident_templates ORDER BY name
  `).all();

  res.json(templates);
});

// Get template by ID
router.get('/:id', authenticateToken, (req, res) => {
  const template = db.prepare('SELECT * FROM incident_templates WHERE id = ?').get(req.params.id);
  
  if (!template) {
    return res.status(404).json({ error: 'Template not found' });
  }

  res.json(template);
});

// Create template
router.post('/', authenticateToken, (req, res) => {
  const { name, title, status, impact, message } = req.body;

  if (!name || !title) {
    return res.status(400).json({ error: 'Name and title are required' });
  }

  const result = db.prepare(`
    INSERT INTO incident_templates (name, title, status, impact, message)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    name,
    title,
    status || 'investigating',
    impact || 'minor',
    message || null
  );

  const template = db.prepare('SELECT * FROM incident_templates WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(template);
});

// Update template
router.put('/:id', authenticateToken, (req, res) => {
  const { name, title, status, impact, message } = req.body;

  const existing = db.prepare('SELECT * FROM incident_templates WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'Template not found' });
  }

  db.prepare(`
    UPDATE incident_templates 
    SET name = ?, title = ?, status = ?, impact = ?, message = ?
    WHERE id = ?
  `).run(
    name || existing.name,
    title || existing.title,
    status || existing.status,
    impact || existing.impact,
    message !== undefined ? message : existing.message,
    req.params.id
  );

  const template = db.prepare('SELECT * FROM incident_templates WHERE id = ?').get(req.params.id);
  res.json(template);
});

// Delete template
router.delete('/:id', authenticateToken, (req, res) => {
  const result = db.prepare('DELETE FROM incident_templates WHERE id = ?').run(req.params.id);
  
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Template not found' });
  }

  res.json({ message: 'Template deleted successfully' });
});

// Use template to create incident
router.post('/:id/use', authenticateToken, (req, res) => {
  const { service_ids } = req.body;

  const template = db.prepare('SELECT * FROM incident_templates WHERE id = ?').get(req.params.id);
  if (!template) {
    return res.status(404).json({ error: 'Template not found' });
  }

  // Create incident from template
  const result = db.prepare(`
    INSERT INTO incidents (title, status, impact, is_scheduled)
    VALUES (?, ?, ?, 0)
  `).run(template.title, template.status, template.impact);

  const incidentId = result.lastInsertRowid;

  // Add initial update if template has message
  if (template.message) {
    db.prepare(`
      INSERT INTO incident_updates (incident_id, status, message)
      VALUES (?, ?, ?)
    `).run(incidentId, template.status, template.message);
  }

  // Link services
  if (service_ids && service_ids.length > 0) {
    const insertLink = db.prepare('INSERT INTO incident_services (incident_id, service_id) VALUES (?, ?)');
    for (const serviceId of service_ids) {
      insertLink.run(incidentId, serviceId);
    }
  }

  const incident = db.prepare('SELECT * FROM incidents WHERE id = ?').get(incidentId);
  res.status(201).json(incident);
});

export default router;

