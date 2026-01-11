import express from 'express';
import db from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get all metrics with latest values (public)
router.get('/', (req, res) => {
  const metrics = db.prepare(`
    SELECT m.*, 
      (SELECT value FROM metric_points WHERE metric_id = m.id ORDER BY recorded_at DESC LIMIT 1) as latest_value,
      (SELECT recorded_at FROM metric_points WHERE metric_id = m.id ORDER BY recorded_at DESC LIMIT 1) as latest_recorded_at
    FROM metrics m
    ORDER BY m.display_order, m.name
  `).all();

  res.json(metrics);
});

// Get metric with historical data (public)
router.get('/:id', (req, res) => {
  const metric = db.prepare('SELECT * FROM metrics WHERE id = ?').get(req.params.id);
  
  if (!metric) {
    return res.status(404).json({ error: 'Metric not found' });
  }

  const hours = parseInt(req.query.hours) || 24;
  
  const points = db.prepare(`
    SELECT value, recorded_at
    FROM metric_points
    WHERE metric_id = ? AND recorded_at >= datetime('now', '-' || ? || ' hours')
    ORDER BY recorded_at ASC
  `).all(req.params.id, hours);

  // Calculate stats
  const values = points.map(p => p.value);
  const stats = {
    min: values.length ? Math.min(...values) : null,
    max: values.length ? Math.max(...values) : null,
    avg: values.length ? values.reduce((a, b) => a + b, 0) / values.length : null,
    latest: values.length ? values[values.length - 1] : null
  };

  res.json({ ...metric, points, stats });
});

// Get metric points for chart (public)
router.get('/:id/points', (req, res) => {
  const hours = parseInt(req.query.hours) || 24;
  
  const points = db.prepare(`
    SELECT value, recorded_at
    FROM metric_points
    WHERE metric_id = ? AND recorded_at >= datetime('now', '-' || ? || ' hours')
    ORDER BY recorded_at ASC
  `).all(req.params.id, hours);

  res.json(points);
});

// ===== ADMIN ROUTES =====

// Create metric
router.post('/', authenticateToken, (req, res) => {
  const { name, suffix, description, display_chart, default_value, calc_type, display_order } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  const result = db.prepare(`
    INSERT INTO metrics (name, suffix, description, display_chart, default_value, calc_type, display_order)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    name,
    suffix || '',
    description || null,
    display_chart !== undefined ? (display_chart ? 1 : 0) : 1,
    default_value || null,
    calc_type || 'average',
    display_order || 0
  );

  const metric = db.prepare('SELECT * FROM metrics WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(metric);
});

// Update metric
router.put('/:id', authenticateToken, (req, res) => {
  const { name, suffix, description, display_chart, default_value, calc_type, display_order } = req.body;

  const existing = db.prepare('SELECT * FROM metrics WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'Metric not found' });
  }

  db.prepare(`
    UPDATE metrics 
    SET name = ?, suffix = ?, description = ?, display_chart = ?, default_value = ?, calc_type = ?, display_order = ?
    WHERE id = ?
  `).run(
    name || existing.name,
    suffix !== undefined ? suffix : existing.suffix,
    description !== undefined ? description : existing.description,
    display_chart !== undefined ? (display_chart ? 1 : 0) : existing.display_chart,
    default_value !== undefined ? default_value : existing.default_value,
    calc_type || existing.calc_type,
    display_order !== undefined ? display_order : existing.display_order,
    req.params.id
  );

  const metric = db.prepare('SELECT * FROM metrics WHERE id = ?').get(req.params.id);
  res.json(metric);
});

// Delete metric
router.delete('/:id', authenticateToken, (req, res) => {
  const result = db.prepare('DELETE FROM metrics WHERE id = ?').run(req.params.id);
  
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Metric not found' });
  }

  res.json({ message: 'Metric deleted successfully' });
});

// Add metric point
router.post('/:id/points', authenticateToken, (req, res) => {
  const { value, recorded_at } = req.body;

  if (value === undefined || value === null) {
    return res.status(400).json({ error: 'Value is required' });
  }

  const metric = db.prepare('SELECT * FROM metrics WHERE id = ?').get(req.params.id);
  if (!metric) {
    return res.status(404).json({ error: 'Metric not found' });
  }

  const result = db.prepare(`
    INSERT INTO metric_points (metric_id, value, recorded_at)
    VALUES (?, ?, ?)
  `).run(req.params.id, value, recorded_at || new Date().toISOString());

  const point = db.prepare('SELECT * FROM metric_points WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(point);
});

// Delete old metric points (cleanup)
router.delete('/:id/points/cleanup', authenticateToken, (req, res) => {
  const days = parseInt(req.query.days) || 30;
  
  const result = db.prepare(`
    DELETE FROM metric_points 
    WHERE metric_id = ? AND recorded_at < datetime('now', '-' || ? || ' days')
  `).run(req.params.id, days);

  res.json({ deleted: result.changes });
});

export default router;

