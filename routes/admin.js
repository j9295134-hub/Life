const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Stock = require('../models/Stock');
const Investment = require('../models/Investment');
const Transaction = require('../models/Transaction');
const Settings = require('../models/Settings');
const { protect, adminOnly } = require('../middleware/auth');

const auth = [protect, adminOnly];
const generateRef = () => 'SYS-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5).toUpperCase();

// GET /api/admin/stats
router.get('/stats', auth, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ role: 'user' });
    const activeInvestments = await Investment.countDocuments({ status: 'active' });
    const pendingDeposits = await Transaction.countDocuments({ type: 'deposit', status: 'pending' });
    const pendingWithdrawals = await Transaction.countDocuments({ type: 'withdrawal', status: 'pending' });
    const totalStocks = await Stock.countDocuments({ isActive: true });
    const totalDeposited = await Transaction.aggregate([{ $match: { type: 'deposit', status: 'approved' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]);
    const totalWithdrawn = await Transaction.aggregate([{ $match: { type: 'withdrawal', status: 'approved' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]);

    res.json({
      success: true,
      stats: {
        totalUsers,
        activeInvestments,
        pendingDeposits,
        pendingWithdrawals,
        totalStocks,
        totalDeposited: totalDeposited[0]?.total || 0,
        totalWithdrawn: totalWithdrawn[0]?.total || 0
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// GET /api/admin/users  (paginated)
router.get('/users', auth, async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 50);
    const total = await User.countDocuments({ role: 'user' });
    const users = await User.find({ role: 'user' })
      .select('-password').sort({ createdAt: -1 })
      .skip((page - 1) * limit).limit(limit);
    res.json({ success: true, users, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// PUT /api/admin/users/:id/suspend
router.put('/users/:id/suspend', auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    user.isSuspended = !user.isSuspended;
    await user.save();
    res.json({ success: true, message: `User ${user.isSuspended ? 'suspended' : 'reactivated'}.` });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// PUT /api/admin/users/:id/wallet
router.put('/users/:id/wallet', auth, async (req, res) => {
  try {
    const { amount, action, note } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    const parsedAmount = parseFloat(amount);
    if (action === 'credit') user.walletBalance += parsedAmount;
    else if (action === 'debit') {
      if (user.walletBalance < parsedAmount) return res.status(400).json({ success: false, message: 'Insufficient balance.' });
      user.walletBalance -= parsedAmount;
    }
    await user.save();
    await Transaction.create({
      user: user._id, type: action === 'credit' ? 'deposit' : 'withdrawal',
      amount: parsedAmount, currency: user.currency, method: 'system',
      reference: generateRef(), status: 'completed', note: note || `Admin ${action}`
    });
    res.json({ success: true, message: `Wallet ${action}ed successfully.` });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// GET /api/admin/deposits
const VALID_STATUSES = ['pending', 'approved', 'rejected', 'completed', 'cancelled'];
router.get('/deposits', auth, async (req, res) => {
  try {
    const { status } = req.query;
    const filter = { type: 'deposit' };
    if (status) {
      if (!VALID_STATUSES.includes(status)) return res.status(400).json({ success: false, message: 'Invalid status filter.' });
      filter.status = status;
    }
    const deposits = await Transaction.find(filter).populate('user', 'fullName email currency currencySymbol').sort({ createdAt: -1 });
    res.json({ success: true, deposits });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// PUT /api/admin/deposits/:id/confirm
router.put('/deposits/:id/confirm', auth, async (req, res) => {
  try {
    const { action, adminNote } = req.body;
    const txn = await Transaction.findById(req.params.id).populate('user');
    if (!txn || txn.type !== 'deposit') return res.status(404).json({ success: false, message: 'Transaction not found.' });
    if (txn.status !== 'pending') return res.status(400).json({ success: false, message: 'Transaction already processed.' });

    if (action === 'approve') {
      txn.status = 'approved';
      const user = await User.findById(txn.user._id);
      user.walletBalance += txn.amount;
      await user.save();
    } else {
      txn.status = 'rejected';
    }
    txn.adminNote = adminNote || '';
    txn.processedBy = req.user._id;
    txn.processedAt = new Date();
    await txn.save();
    res.json({ success: true, message: `Deposit ${action === 'approve' ? 'approved' : 'rejected'}.` });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// GET /api/admin/withdrawals
router.get('/withdrawals', auth, async (req, res) => {
  try {
    const { status } = req.query;
    const filter = { type: 'withdrawal' };
    if (status) {
      if (!VALID_STATUSES.includes(status)) return res.status(400).json({ success: false, message: 'Invalid status filter.' });
      filter.status = status;
    }
    const withdrawals = await Transaction.find(filter).populate('user', 'fullName email currency currencySymbol').sort({ createdAt: -1 });
    res.json({ success: true, withdrawals });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// PUT /api/admin/withdrawals/:id/confirm
router.put('/withdrawals/:id/confirm', auth, async (req, res) => {
  try {
    const { action, adminNote } = req.body;
    const txn = await Transaction.findById(req.params.id).populate('user');
    if (!txn || txn.type !== 'withdrawal') return res.status(404).json({ success: false, message: 'Transaction not found.' });
    if (txn.status !== 'pending') return res.status(400).json({ success: false, message: 'Transaction already processed.' });

    if (action === 'approve') {
      txn.status = 'approved';
    } else {
      // Refund wallet on rejection
      txn.status = 'rejected';
      const user = await User.findById(txn.user._id);
      user.walletBalance += txn.amount;
      await user.save();
    }
    txn.adminNote = adminNote || '';
    txn.processedBy = req.user._id;
    txn.processedAt = new Date();
    await txn.save();
    res.json({ success: true, message: `Withdrawal ${action === 'approve' ? 'approved' : 'rejected'}.` });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// GET /api/admin/settings
router.get('/settings', auth, async (req, res) => {
  try {
    const settings = await Settings.find();
    const result = {};
    settings.forEach(s => result[s.key] = s.value);
    res.json({ success: true, settings: result });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// PUT /api/admin/settings
const ALLOWED_SETTINGS_KEYS = [
  'deposit_accounts', 'min_deposit', 'min_withdrawal',
  'referral_bonus', 'site_name', 'maintenance_mode', 'withdrawal_accounts'
];
router.put('/settings', auth, async (req, res) => {
  try {
    const updates = req.body;
    const invalidKeys = Object.keys(updates).filter(k => !ALLOWED_SETTINGS_KEYS.includes(k));
    if (invalidKeys.length) return res.status(400).json({ success: false, message: `Invalid setting key(s): ${invalidKeys.join(', ')}` });
    for (const [key, value] of Object.entries(updates)) {
      await Settings.findOneAndUpdate({ key }, { key, value, updatedAt: new Date() }, { upsert: true });
    }
    res.json({ success: true, message: 'Settings updated.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// GET /api/admin/all-stocks
router.get('/all-stocks', auth, async (req, res) => {
  try {
    const stocks = await Stock.find().sort({ createdAt: -1 });
    res.json({ success: true, stocks });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
