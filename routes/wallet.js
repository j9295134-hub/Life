const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const Settings = require('../models/Settings');
const { protect } = require('../middleware/auth');

const MIN_DEPOSIT = 40;
const MIN_WITHDRAWAL = 50;
const generateRef = () => 'TXN-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5).toUpperCase();

// GET /api/wallet/transactions
router.get('/transactions', protect, async (req, res) => {
  try {
    const transactions = await Transaction.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(50);
    res.json({ success: true, transactions });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// GET /api/wallet/deposit-accounts - get admin deposit accounts
router.get('/deposit-accounts', protect, async (req, res) => {
  try {
    const setting = await Settings.findOne({ key: 'deposit_accounts' });
    res.json({ success: true, accounts: setting ? setting.value : [] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// POST /api/wallet/deposit
router.post('/deposit', protect, async (req, res) => {
  try {
    const { amount, method, accountName, accountNumber, bankName, network, transactionId } = req.body;
    const parsedAmount = parseFloat(amount);

    if (!parsedAmount || parsedAmount < MIN_DEPOSIT) {
      return res.status(400).json({ success: false, message: `Minimum deposit is ${req.user.currencySymbol}${MIN_DEPOSIT}.` });
    }
    if (!transactionId) return res.status(400).json({ success: false, message: 'Transaction ID is required.' });

    const accountDetails = { accountName, accountNumber, bankName: bankName || null, network: network || null };

    const txn = await Transaction.create({
      user: req.user._id,
      type: 'deposit',
      amount: parsedAmount,
      currency: req.user.currency,
      method,
      accountDetails,
      transactionId,
      reference: generateRef(),
      status: 'pending',
      note: `Deposit via ${method.replace(/_/g, ' ')}`
    });

    res.status(201).json({ success: true, message: 'Deposit request submitted. Awaiting confirmation.', transaction: txn });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// POST /api/wallet/withdraw  (atomic — balance deduct + txn record in one session)
router.post('/withdraw', protect, async (req, res) => {
  const mongoose = require('mongoose');
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { amount, method, accountName, accountNumber, bankName, network } = req.body;
    const parsedAmount = parseFloat(amount);

    if (!parsedAmount || parsedAmount < MIN_WITHDRAWAL) {
      await session.abortTransaction(); session.endSession();
      return res.status(400).json({ success: false, message: `Minimum withdrawal is ${req.user.currencySymbol}${MIN_WITHDRAWAL}.` });
    }

    const VALID_METHODS = ['mtn_momo', 'telecel_momo', 'airteltigo_momo', 'bank'];
    if (!VALID_METHODS.includes(method)) {
      await session.abortTransaction(); session.endSession();
      return res.status(400).json({ success: false, message: 'Invalid payment method.' });
    }

    const user = await User.findById(req.user._id).session(session);
    if (user.walletBalance < parsedAmount) {
      await session.abortTransaction(); session.endSession();
      return res.status(400).json({ success: false, message: 'Insufficient wallet balance.' });
    }

    user.walletBalance -= parsedAmount;
    await user.save({ session });

    const [txn] = await Transaction.create([{
      user: req.user._id,
      type: 'withdrawal',
      amount: parsedAmount,
      currency: req.user.currency,
      method,
      accountDetails: { accountName, accountNumber, bankName: bankName || null, network: network || null },
      reference: generateRef(),
      status: 'pending',
      note: `Withdrawal via ${method.replace(/_/g, ' ')}`
    }], { session });

    await session.commitTransaction();
    session.endSession();
    res.status(201).json({ success: true, message: 'Withdrawal request submitted. Processing within 24 hours.', transaction: txn });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
