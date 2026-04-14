require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
const cron = require('node-cron');

const app = express();

// ── CORS — restrict to frontend domain only ──
const allowedOrigins = [
  'https://life-lovat.vercel.app',
  'http://localhost:3000',
  'http://localhost:5500'
];
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ── Body parsing with size limits ──
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ── Security headers ──
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

// ── Rate limiters ──
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 30,
  message: { success: false, message: 'Too many attempts. Please try again later.' }
});
const walletLimiter = rateLimit({
  windowMs: 60 * 1000, max: 10,
  message: { success: false, message: 'Too many requests. Please slow down.' }
});
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 200,
  message: { success: false, message: 'Too many requests. Please try again later.' }
});

// ── Routes ──
app.use('/api/auth',        authLimiter,    require('./routes/auth'));
app.use('/api/wallet',      walletLimiter,  require('./routes/wallet'));
app.use('/api/investments', generalLimiter, require('./routes/investments'));
app.use('/api/stocks',      generalLimiter, require('./routes/stocks'));
app.use('/api/user',        generalLimiter, require('./routes/user'));
app.use('/api/admin',       generalLimiter, require('./routes/admin'));

// ── Public contact endpoint (no auth — all pages use this) ──
const Settings = require('./models/Settings');
app.get('/api/contact', generalLimiter, async (req, res) => {
  try {
    const docs = await Settings.find({ key: { $in: ['whatsapp','telegram','email'] } });
    const r = {};
    docs.forEach(d => r[d.key] = d.value);
    res.json({ success: true, whatsapp: r.whatsapp||'', telegram: r.telegram||'', email: r.email||'' });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

// Cron: Check and credit matured investments every minute
const Investment = require('./models/Investment');
const User = require('./models/User');
const Transaction = require('./models/Transaction');

cron.schedule('* * * * *', async () => {
  try {
    const matured = await Investment.find({ status: 'active', endDate: { $lte: new Date() } }).populate('user');
    for (const inv of matured) {
      const user = await User.findById(inv.user._id);
      if (!user) continue;
      user.walletBalance += inv.totalReturn;
      user.totalEarnings += inv.roiAmount;
      await user.save();
      inv.status = 'completed';
      inv.creditedAt = new Date();
      await inv.save();
      await Transaction.create({
        user: user._id, type: 'return', amount: inv.totalReturn,
        currency: user.currency, method: 'system',
        reference: 'RET-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4).toUpperCase(),
        status: 'completed',
        note: `Investment return for ${inv.stockSnapshot.name}`
      });
    }
    if (matured.length > 0) console.log(`[CRON] Credited ${matured.length} matured investment(s).`);
  } catch (err) {
    console.error('[CRON] Error processing investments:', err.message);
  }
});

// Serve SPA for dashboard and admin routes
app.get('/dashboard*', (req, res) => res.sendFile(path.join(__dirname, 'public/dashboard/index.html')));
app.get('/admin*', (req, res) => res.sendFile(path.join(__dirname, 'public/admin/index.html')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public/index.html')));

// Connect DB and start server
const PORT = process.env.PORT || 3000;
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/agriclife')
  .then(() => {
    console.log('MongoDB connected.');
    app.listen(PORT, () => console.log(`AgricLife running on http://localhost:${PORT}`));
  })
  .catch(err => { console.error('DB connection failed:', err.message); process.exit(1); });
