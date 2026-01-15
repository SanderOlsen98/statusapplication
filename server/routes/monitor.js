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

// Extract hostname from URL or return as-is if already a hostname
function extractHostname(input) {
  try {
    if (input.includes('://')) {
      const url = new URL(input);
      return url.hostname;
    }
    return input;
  } catch {
    return input;
  }
}

// Test a URL (admin only)
router.post('/test', authenticateToken, async (req, res) => {
  const { url, type } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  // Handle ping test
  if (type === 'ping') {
    try {
      const { execSync } = await import('child_process');
      const host = extractHostname(url);
      const startTime = Date.now();
      
      // Use ping command - 1 packet, 5 second timeout
      const isWindows = process.platform === 'win32';
      const pingCmd = isWindows 
        ? `ping -n 1 -w 5000 ${host}`
        : `ping -c 1 -W 5 ${host}`;
      
      execSync(pingCmd, { timeout: 10000, stdio: 'pipe' });
      const responseTime = Date.now() - startTime;
      
      res.json({
        success: true,
        responseTime,
        ok: true
      });
    } catch (error) {
      res.json({
        success: false,
        error: 'Host unreachable or ping failed'
      });
    }
    return;
  }

  // Handle HTTP test
  try {
    const startTime = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Staytus/1.0 (Status Monitor)',
        'Accept': 'text/html,application/json,*/*'
      }
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

