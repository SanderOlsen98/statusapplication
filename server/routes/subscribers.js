import express from 'express';
import crypto from 'crypto';
import db from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Subscribe (public)
router.post('/subscribe', (req, res) => {
  const { email, webhook_url, notify_type, service_ids } = req.body;

  if (!email && !webhook_url) {
    return res.status(400).json({ error: 'Email or webhook URL is required' });
  }

  // Check if already subscribed
  if (email) {
    const existing = db.prepare('SELECT id FROM subscribers WHERE email = ?').get(email);
    if (existing) {
      return res.status(400).json({ error: 'Email is already subscribed' });
    }
  }

  const verify_token = crypto.randomBytes(32).toString('hex');

  const result = db.prepare(`
    INSERT INTO subscribers (email, webhook_url, notify_type, verify_token)
    VALUES (?, ?, ?, ?)
  `).run(
    email || null,
    webhook_url || null,
    notify_type || 'all',
    verify_token
  );

  const subscriberId = result.lastInsertRowid;

  // Link to specific services if provided
  if (service_ids && service_ids.length > 0) {
    const insertLink = db.prepare('INSERT INTO subscriber_services (subscriber_id, service_id) VALUES (?, ?)');
    for (const serviceId of service_ids) {
      try {
        insertLink.run(subscriberId, serviceId);
      } catch (e) {
        // Ignore if service doesn't exist
      }
    }
  }

  // In production, you would send a verification email here
  // For now, we'll auto-verify
  db.prepare('UPDATE subscribers SET verified = 1 WHERE id = ?').run(subscriberId);

  res.status(201).json({ 
    message: 'Successfully subscribed',
    id: subscriberId
  });
});

// Verify subscription (public)
router.get('/verify/:token', (req, res) => {
  const result = db.prepare(`
    UPDATE subscribers SET verified = 1 WHERE verify_token = ? AND verified = 0
  `).run(req.params.token);

  if (result.changes === 0) {
    return res.status(400).json({ error: 'Invalid or already verified token' });
  }

  res.json({ message: 'Email verified successfully' });
});

// Unsubscribe (public)
router.post('/unsubscribe', (req, res) => {
  const { email, token } = req.body;

  let result;
  if (token) {
    result = db.prepare('DELETE FROM subscribers WHERE verify_token = ?').run(token);
  } else if (email) {
    result = db.prepare('DELETE FROM subscribers WHERE email = ?').run(email);
  } else {
    return res.status(400).json({ error: 'Email or token is required' });
  }

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Subscriber not found' });
  }

  res.json({ message: 'Successfully unsubscribed' });
});

// ===== ADMIN ROUTES =====

// Get all subscribers
router.get('/', authenticateToken, (req, res) => {
  const subscribers = db.prepare(`
    SELECT s.*, 
      GROUP_CONCAT(sv.name) as service_names
    FROM subscribers s
    LEFT JOIN subscriber_services ss ON s.id = ss.subscriber_id
    LEFT JOIN services sv ON ss.service_id = sv.id
    GROUP BY s.id
    ORDER BY s.created_at DESC
  `).all();

  res.json(subscribers.map(sub => ({
    ...sub,
    services: sub.service_names ? sub.service_names.split(',') : []
  })));
});

// Get subscriber by ID
router.get('/:id', authenticateToken, (req, res) => {
  const subscriber = db.prepare(`
    SELECT s.*, 
      GROUP_CONCAT(ss.service_id) as service_ids
    FROM subscribers s
    LEFT JOIN subscriber_services ss ON s.id = ss.subscriber_id
    WHERE s.id = ?
    GROUP BY s.id
  `).get(req.params.id);

  if (!subscriber) {
    return res.status(404).json({ error: 'Subscriber not found' });
  }

  res.json({
    ...subscriber,
    service_ids: subscriber.service_ids ? subscriber.service_ids.split(',').map(Number) : []
  });
});

// Create subscriber (admin)
router.post('/', authenticateToken, (req, res) => {
  const { email, webhook_url, notify_type, service_ids, verified } = req.body;

  if (!email && !webhook_url) {
    return res.status(400).json({ error: 'Email or webhook URL is required' });
  }

  const verify_token = crypto.randomBytes(32).toString('hex');

  const result = db.prepare(`
    INSERT INTO subscribers (email, webhook_url, notify_type, verify_token, verified)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    email || null,
    webhook_url || null,
    notify_type || 'all',
    verify_token,
    verified ? 1 : 0
  );

  const subscriberId = result.lastInsertRowid;

  if (service_ids && service_ids.length > 0) {
    const insertLink = db.prepare('INSERT INTO subscriber_services (subscriber_id, service_id) VALUES (?, ?)');
    for (const serviceId of service_ids) {
      try {
        insertLink.run(subscriberId, serviceId);
      } catch (e) {}
    }
  }

  const subscriber = db.prepare('SELECT * FROM subscribers WHERE id = ?').get(subscriberId);
  res.status(201).json(subscriber);
});

// Update subscriber
router.put('/:id', authenticateToken, (req, res) => {
  const { email, webhook_url, notify_type, verified, service_ids } = req.body;

  const existing = db.prepare('SELECT * FROM subscribers WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'Subscriber not found' });
  }

  db.prepare(`
    UPDATE subscribers 
    SET email = ?, webhook_url = ?, notify_type = ?, verified = ?
    WHERE id = ?
  `).run(
    email !== undefined ? email : existing.email,
    webhook_url !== undefined ? webhook_url : existing.webhook_url,
    notify_type || existing.notify_type,
    verified !== undefined ? (verified ? 1 : 0) : existing.verified,
    req.params.id
  );

  // Update service links if provided
  if (service_ids !== undefined) {
    db.prepare('DELETE FROM subscriber_services WHERE subscriber_id = ?').run(req.params.id);
    const insertLink = db.prepare('INSERT INTO subscriber_services (subscriber_id, service_id) VALUES (?, ?)');
    for (const serviceId of service_ids) {
      try {
        insertLink.run(req.params.id, serviceId);
      } catch (e) {}
    }
  }

  const subscriber = db.prepare('SELECT * FROM subscribers WHERE id = ?').get(req.params.id);
  res.json(subscriber);
});

// Delete subscriber
router.delete('/:id', authenticateToken, (req, res) => {
  const result = db.prepare('DELETE FROM subscribers WHERE id = ?').run(req.params.id);
  
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Subscriber not found' });
  }

  res.json({ message: 'Subscriber deleted successfully' });
});

// Get subscriber stats
router.get('/admin/stats', authenticateToken, (req, res) => {
  const total = db.prepare('SELECT COUNT(*) as count FROM subscribers').get();
  const verified = db.prepare('SELECT COUNT(*) as count FROM subscribers WHERE verified = 1').get();
  const email = db.prepare('SELECT COUNT(*) as count FROM subscribers WHERE email IS NOT NULL').get();
  const webhook = db.prepare('SELECT COUNT(*) as count FROM subscribers WHERE webhook_url IS NOT NULL').get();

  res.json({
    total: total.count,
    verified: verified.count,
    email: email.count,
    webhook: webhook.count
  });
});

export default router;

