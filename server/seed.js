import db from './db.js';
import bcrypt from 'bcryptjs';

console.log('🌱 Seeding database...');

// Create default admin user
const hashedPassword = bcrypt.hashSync('admin123', 10);
const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');

if (!existingUser) {
  db.prepare('INSERT INTO users (username, password, email) VALUES (?, ?, ?)').run(
    'admin',
    hashedPassword,
    'admin@localhost'
  );
  console.log('✅ Created admin user (username: admin, password: admin123)');
} else {
  console.log('ℹ️  Admin user already exists');
}

// Create default settings
const defaultSettings = [
  ['site_name', 'System Status'],
  ['site_description', 'Current status of our services and infrastructure'],
  ['logo_url', ''],
  ['timezone', 'UTC'],
  ['theme', 'dark']
];

const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
for (const [key, value] of defaultSettings) {
  insertSetting.run(key, value);
}
console.log('✅ Default settings initialized');

// Create sample service groups
const existingGroups = db.prepare('SELECT COUNT(*) as count FROM service_groups').get();

if (existingGroups.count === 0) {
  const insertGroup = db.prepare('INSERT INTO service_groups (name, description, display_order) VALUES (?, ?, ?)');
  
  const groups = [
    { name: 'Core Infrastructure', description: 'Essential backend services', order: 1 },
    { name: 'Web Services', description: 'Public-facing web applications', order: 2 },
    { name: 'Network', description: 'Network and connectivity services', order: 3 },
    { name: 'Internal Tools', description: 'Internal applications and tools', order: 4 }
  ];

  const groupIds = {};
  for (const group of groups) {
    const result = insertGroup.run(group.name, group.description, group.order);
    groupIds[group.name] = result.lastInsertRowid;
  }
  console.log('✅ Created sample service groups');

  // Create sample services
  const insertService = db.prepare(`
    INSERT INTO services (group_id, name, description, status, monitor_type, monitor_url, display_order)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const services = [
    { group: 'Core Infrastructure', name: 'Database Server', description: 'Primary PostgreSQL cluster', status: 'operational', type: 'http', url: '', order: 1 },
    { group: 'Core Infrastructure', name: 'Authentication Service', description: 'User authentication and SSO', status: 'operational', type: 'manual', url: '', order: 2 },
    { group: 'Core Infrastructure', name: 'Storage Cluster', description: 'Object storage and file services', status: 'operational', type: 'manual', url: '', order: 3 },
    { group: 'Web Services', name: 'Main Website', description: 'Primary company website', status: 'operational', type: 'http', url: 'https://example.com', order: 1 },
    { group: 'Web Services', name: 'Customer Portal', description: 'Customer self-service portal', status: 'operational', type: 'http', url: '', order: 2 },
    { group: 'Web Services', name: 'API Gateway', description: 'REST API endpoints', status: 'operational', type: 'http', url: '', order: 3 },
    { group: 'Network', name: 'Primary DNS', description: 'DNS resolution services', status: 'operational', type: 'manual', url: '', order: 1 },
    { group: 'Network', name: 'Load Balancer', description: 'Traffic distribution', status: 'operational', type: 'manual', url: '', order: 2 },
    { group: 'Network', name: 'VPN Gateway', description: 'Remote access VPN', status: 'operational', type: 'manual', url: '', order: 3 },
    { group: 'Internal Tools', name: 'Email Server', description: 'Internal email service', status: 'operational', type: 'manual', url: '', order: 1 },
    { group: 'Internal Tools', name: 'CI/CD Pipeline', description: 'Build and deployment automation', status: 'operational', type: 'manual', url: '', order: 2 }
  ];

  for (const service of services) {
    insertService.run(groupIds[service.group], service.name, service.description, service.status, service.type, service.url, service.order);
  }
  console.log('✅ Created sample services');

  // Generate some historical uptime data
  const insertUptime = db.prepare(`
    INSERT INTO daily_uptime (service_id, date, uptime_percentage, total_checks, successful_checks, avg_response_time)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const allServices = db.prepare('SELECT id FROM services').all();
  const today = new Date();

  for (const service of allServices) {
    for (let i = 89; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      // Generate realistic uptime (mostly 100%, occasional dips)
      const rand = Math.random();
      let uptime = 100;
      if (rand < 0.05) uptime = 95 + Math.random() * 5;
      if (rand < 0.02) uptime = 85 + Math.random() * 10;
      
      const totalChecks = 1440; // checks per day
      const successfulChecks = Math.floor(totalChecks * (uptime / 100));
      const avgResponseTime = 50 + Math.floor(Math.random() * 150);

      insertUptime.run(service.id, dateStr, uptime.toFixed(2), totalChecks, successfulChecks, avgResponseTime);
    }
  }
  console.log('✅ Generated 90 days of uptime history');
}

console.log('\n🎉 Database seeding complete!');
console.log('\n📋 Login credentials:');
console.log('   Username: admin');
console.log('   Password: admin123');
console.log('\n⚠️  Please change the default password after first login!');

