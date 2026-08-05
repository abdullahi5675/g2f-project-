require('dotenv').config();
const express  = require('express');
const cors     = require('cors');
const path     = require('path');
const { initDB } = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

// Terminal Logger Middleware
app.use((req, res, next) => {
  const time = new Date().toLocaleTimeString();
  
  // Skip logging page loads and static files to keep the terminal clean
  if (req.method === 'GET' && !req.url.startsWith('/api/')) {
    return next();
  }

  // Log Meaningful Actions
  if (req.method !== 'GET') {
    let actionLog = `[${time}] 🚀 ACTION (${req.method} ${req.url})`;
    if (req.body && req.body.actor_name) {
      actionLog += ` | By: ${req.body.actor_name} (${req.body.actor_role})`;
    } else if (req.body && req.body.full_name) {
      actionLog += ` | User: ${req.body.full_name}`;
    } else if (req.body && req.body.username) {
      actionLog += ` | User: ${req.body.username}`;
    }
    
    res.on('finish', () => {
      const statusIcon = res.statusCode >= 400 ? '❌' : '✅';
      console.log(`${actionLog} -> ${statusIcon} [${res.statusCode}]`);
    });
  } else {
    // Log API fetches
    console.log(`[${time}] 🔄 FETCH: GET ${req.url}`);
  }
  
  next();
});

app.use(express.static(path.join(__dirname, 'public')));

const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'g2f_super_secret_jwt_key_2026';

// API Authentication Middleware — protects all /api routes except login/signup/logout
app.use('/api', (req, res, next) => {
  // Allow auth endpoints without a token
  if (req.path === '/auth/login' || req.path === '/auth/signup' || req.path === '/auth/logout') {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized. Please login first.' });
  }

  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized. Invalid token.' });
  }
});

// Routes
const farmerRoutes = require('./routes/farmers');
const voucherRoutes = require('./routes/vouchers');
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');

app.use('/api/farmers', farmerRoutes);
app.use('/api/vouchers', voucherRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Serve HTML pages
const pages = ['index','register','dashboard','agent','sms-preview'];
pages.forEach(p => {
  app.get('/' + (p === 'index' ? '' : p), (req, res) => {
    res.sendFile(path.join(__dirname, 'public', p + '.html'));
  });
});

const PORT = process.env.PORT || 3000;

initDB().then(() => {
  app.listen(PORT, () => {
    console.log('');
    console.log('🌾 G2F System is running!');
    console.log('   Open your browser and go to: http://localhost:' + PORT);
    console.log('');
  });
}).catch(err => {
  console.error('❌ Could not connect to database:', err.message);
  console.error('   Make sure PostgreSQL is running and your .env password is correct.');
});
