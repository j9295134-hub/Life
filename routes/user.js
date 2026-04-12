const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Investment = require('../models/Investment');
const Transaction = require('../models/Transaction');
const { protect } = require('../middleware/auth');

// GET /api/user/profile
router.get('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// PUT /api/user/profile
router.put('/profile', protect, async (req, res) => {
  try {
    const { fullName, phone } = req.body;
    const user = await User.findByIdAndUpdate(req.user._id, { fullName, phone }, { new: true }).select('-password');
    res.json({ success: true, message: 'Profile updated.', user });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// PUT /api/user/change-password
router.put('/change-password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (newPassword.length < 8) return res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' });
    const user = await User.findById(req.user._id);
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
    user.password = newPassword;
    await user.save();
    res.json({ success: true, message: 'Password changed successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// GET /api/user/dashboard-stats
router.get('/dashboard-stats', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    const activeInvestments = await Investment.countDocuments({ user: req.user._id, status: 'active' });
    const completedInvestments = await Investment.countDocuments({ user: req.user._id, status: 'completed' });
    const totalEarnings = user.totalEarnings;
    const referredUsers = await User.countDocuments({ referredBy: req.user._id });
    res.json({
      success: true,
      stats: {
        walletBalance: user.walletBalance,
        totalInvested: user.totalInvested,
        totalEarnings,
        activeInvestments,
        completedInvestments,
        referralEarnings: user.referralEarnings,
        referralCount: referredUsers,
        currency: user.currency,
        currencySymbol: user.currencySymbol
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// GET /api/user/referrals
router.get('/referrals', protect, async (req, res) => {
  try {
    const referrals = await User.find({ referredBy: req.user._id }).select('fullName email createdAt').sort({ createdAt: -1 });
    res.json({ success: true, referrals });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
