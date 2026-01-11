import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Ensure data directory exists
const dataDir = join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(join(dataDir, 'staytus.db'));

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

// Initialize database schema
db.exec(`
  -- Users table for admin authentication
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    email TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Service groups (e.g., "Core Infrastructure", "Web Services")
  CREATE TABLE IF NOT EXISTS service_groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    display_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Services being monitored
  CREATE TABLE IF NOT EXISTS services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id INTEGER,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'operational',
    monitor_type TEXT DEFAULT 'manual',
    monitor_url TEXT,
    monitor_interval INTEGER DEFAULT 60,
    last_check DATETIME,
    display_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (group_id) REFERENCES service_groups(id) ON DELETE SET NULL
  );

  -- Uptime records for each service
  CREATE TABLE IF NOT EXISTS uptime_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    service_id INTEGER NOT NULL,
    status TEXT NOT NULL,
    response_time INTEGER,
    checked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
  );

  -- Incidents (outages, issues, etc.)
  CREATE TABLE IF NOT EXISTS incidents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    status TEXT DEFAULT 'investigating',
    impact TEXT DEFAULT 'minor',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    resolved_at DATETIME,
    scheduled_for DATETIME,
    scheduled_until DATETIME,
    is_scheduled INTEGER DEFAULT 0
  );

  -- Incident updates
  CREATE TABLE IF NOT EXISTS incident_updates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    incident_id INTEGER NOT NULL,
    status TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE CASCADE
  );

  -- Link incidents to affected services
  CREATE TABLE IF NOT EXISTS incident_services (
    incident_id INTEGER NOT NULL,
    service_id INTEGER NOT NULL,
    PRIMARY KEY (incident_id, service_id),
    FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE CASCADE,
    FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
  );

  -- Daily uptime summary for historical display
  CREATE TABLE IF NOT EXISTS daily_uptime (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    service_id INTEGER NOT NULL,
    date DATE NOT NULL,
    uptime_percentage REAL DEFAULT 100,
    total_checks INTEGER DEFAULT 0,
    successful_checks INTEGER DEFAULT 0,
    avg_response_time INTEGER,
    UNIQUE(service_id, date),
    FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
  );

  -- Settings table for configuration
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  -- Metrics for tracking custom data points
  CREATE TABLE IF NOT EXISTS metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    suffix TEXT DEFAULT '',
    description TEXT,
    display_chart INTEGER DEFAULT 1,
    default_value REAL,
    calc_type TEXT DEFAULT 'average',
    display_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Metric data points
  CREATE TABLE IF NOT EXISTS metric_points (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    metric_id INTEGER NOT NULL,
    value REAL NOT NULL,
    recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (metric_id) REFERENCES metrics(id) ON DELETE CASCADE
  );

  -- Subscribers for notifications
  CREATE TABLE IF NOT EXISTS subscribers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT,
    webhook_url TEXT,
    notify_type TEXT DEFAULT 'all',
    verified INTEGER DEFAULT 0,
    verify_token TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Subscriber service preferences (which services to monitor)
  CREATE TABLE IF NOT EXISTS subscriber_services (
    subscriber_id INTEGER NOT NULL,
    service_id INTEGER NOT NULL,
    PRIMARY KEY (subscriber_id, service_id),
    FOREIGN KEY (subscriber_id) REFERENCES subscribers(id) ON DELETE CASCADE,
    FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
  );

  -- Incident templates for quick incident creation
  CREATE TABLE IF NOT EXISTS incident_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    title TEXT NOT NULL,
    status TEXT DEFAULT 'investigating',
    impact TEXT DEFAULT 'minor',
    message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

export default db;

