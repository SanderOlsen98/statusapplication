import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import cron from 'node-cron';

import authRoutes from './routes/auth.js';
import servicesRoutes from './routes/services.js';
import incidentsRoutes from './routes/incidents.js';
import settingsRoutes from './routes/settings.js';
import monitorRoutes from './routes/monitor.js';
import { runMonitorCheck, calculateDailyUptime } from './monitor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/incidents', incidentsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/monitor', monitorRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(join(__dirname, '..', 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(join(__dirname, '..', 'dist', 'index.html'));
  });
}

// Schedule monitoring checks every minute
cron.schedule('* * * * *', () => {
  runMonitorCheck();
});

// Calculate daily uptime at midnight
cron.schedule('0 0 * * *', () => {
  calculateDailyUptime();
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 Staytus server running on http://localhost:${PORT}`);
  console.log(`   API available at http://localhost:${PORT}/api`);
  if (process.env.NODE_ENV !== 'production') {
    console.log(`   Frontend dev server at http://localhost:3000`);
  }
  console.log('\n');
});

