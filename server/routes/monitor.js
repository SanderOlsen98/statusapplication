import express from 'express';
import db from '../db.js';
import { authenticateToken } from '../middleware/auth.js';
import { runMonitorCheck } from '../monitor.js';

const router = express.Router();

// Trigger manual check (admin only)
router.post('/check', authenticateToken, async (req, res) => {
  try {
    await runMonitorCheck();
    res.json({ message: 'Monitor check completed' });
  } catch (error) {
    res.status(500).json({ error: 'Monitor check failed', details: error.message });
  }
});

// Get recent uptime records for a service
router.get('/records/:serviceId', authenticateToken, (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  
  const records = db.prepare(`
    SELECT * FROM uptime_records
    WHERE service_id = ?
    ORDER BY checked_at DESC
    LIMIT ?
  `).all(req.params.serviceId, limit);

  res.json(records);
});

// Test a URL (admin only)
router.post('/test', authenticateToken, async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    const startTime = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal
    });

    clearTimeout(timeout);
    const responseTime = Date.now() - startTime;

    res.json({
      success: true,
      status: response.status,
      statusText: response.statusText,
      responseTime,
      ok: response.ok
    });
  } catch (error) {
    res.json({
      success: false,
      error: error.message
    });
  }
});

export default router;

