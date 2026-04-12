const express = require('express');
const router = express.Router();
const Investment = require('../models/Investment');
const Stock = require('../models/Stock');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { protect } = require('../middleware/auth');

const generateRef = () => 'INV-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5).toUpperCase();

// POST /api/investments - create investment
router.post('/', protect, async (req, res) => {
  try {
    const { stockId } = req.body;
    const stock = await Stock.findById(stockId);
    if (!stock || !stock.isActive) return res.status(404).json({ success: false, message: 'Stock not found or unavailable.' });
    if (stock.totalSlots && stock.usedSlots >= stock.totalSlots) return res.status(400).json({ success: false, message: 'This stock is fully subscribed.' });

    const user = await User.findById(req.user._id);
    if (user.walletBalance < stock.price) return res.status(400).json({ success: false, message: 'Insufficient wallet balance. Please deposit funds.' });

    // Calculate end date
    const now = new Date();
    let endDate = new Date(now);
    if (stock.durationUnit === 'hours') endDate.setHours(endDate.getHours() + stock.duration);
    else if (stock.durationUnit === 'days') endDate.setDate(endDate.getDate() + stock.duration);
    else if (stock.durationUnit === 'weeks') endDate.setDate(endDate.getDate() + stock.duration * 7);
    else if (stock.durationUnit === 'months') endDate.setMonth(endDate.getMonth() + stock.duration);

    const roiAmount = (stock.price * stock.roiPercentage) / 100;
    const totalReturn = stock.price + roiAmount;

    const investment = new Investment({
      user: user._id,
      stock: stock._id,
      stockSnapshot: { name: stock.name, category: stock.category, image: stock.image, price: stock.price, duration: stock.duration, durationUnit: stock.durationUnit, roiPercentage: stock.roiPercentage },
      amountInvested: stock.price,
      roiAmount,
      totalReturn,
      startDate: now,
      endDate
    });

    user.walletBalance -= stock.price;
    user.totalInvested += stock.price;
    stock.usedSlots += 1;

    await investment.save();
    await user.save();
    await stock.save();

    await Transaction.create({
      user: user._id,
      type: 'investment',
      amount: stock.price,
      currency: user.currency,
      method: 'system',
      reference: generateRef(),
      status: 'completed',
      note: `Invested in ${stock.name}`
    });

    res.status(201).json({ success: true, message: `Successfully invested in ${stock.name}!`, investment });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// GET /api/investments - user's investments
router.get('/', protect, async (req, res) => {
  try {
    const { status } = req.query;
    const filter = { user: req.user._id };
    if (status) filter.status = status;
    const investments = await Investment.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, investments });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
