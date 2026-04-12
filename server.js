require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
const cron = require('node-cron');

const app = express();

// Rate limiting — auth routes only (strict), all other routes unrestricted
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { success: false, message: 'Too many attempts. Please try again later.' }
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api/auth', authLimiter, require('./routes/auth'));
app.use('/api/stocks', require('./routes/stocks'));
app.use('/api/investments', require('./routes/investments'));
app.use('/api/wallet', require('./routes/wallet'));
app.use('/api/user', require('./routes/user'));
app.use('/api/admin', require('./routes/admin'));

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
