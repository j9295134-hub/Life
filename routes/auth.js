const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const fetch = require('node-fetch');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Settings = require('../models/Settings');

async function verifyRecaptcha(token) {
  if (!token) return false;
  try {
    const r = await fetch(`https://www.google.com/recaptcha/api/siteverify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${token}`
    });
    const data = await r.json();
    return data.success === true;
  } catch { return false; }
}

const REFERRAL_BONUS = 10;

// Currency map by country
const countryCurrencyMap = {
  'Ghana': { currency: 'GHS', symbol: 'GH₵' },
  'Nigeria': { currency: 'NGN', symbol: '₦' },
  'Kenya': { currency: 'KES', symbol: 'KSh' },
  'South Africa': { currency: 'ZAR', symbol: 'R' },
  'United States': { currency: 'USD', symbol: '$' },
  'United Kingdom': { currency: 'GBP', symbol: '£' },
  'Canada': { currency: 'CAD', symbol: 'CA$' },
  'Australia': { currency: 'AUD', symbol: 'A$' },
  'Germany': { currency: 'EUR', symbol: '€' },
  'France': { currency: 'EUR', symbol: '€' },
  'Uganda': { currency: 'UGX', symbol: 'USh' },
  'Tanzania': { currency: 'TZS', symbol: 'TSh' },
  'Rwanda': { currency: 'RWF', symbol: 'RF' },
  'Zambia': { currency: 'ZMW', symbol: 'ZK' },
  'Zimbabwe': { currency: 'USD', symbol: '$' },
  'Ethiopia': { currency: 'ETB', symbol: 'Br' },
  'Cameroon': { currency: 'XAF', symbol: 'FCFA' },
  'Ivory Coast': { currency: 'XOF', symbol: 'CFA' },
  'Senegal': { currency: 'XOF', symbol: 'CFA' },
  'Default': { currency: 'USD', symbol: '$' }
};

// Generate unique referral code
const generateReferralCode = () => uuidv4().split('-')[0].toUpperCase();
const generateRef = () => 'REF-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5).toUpperCase();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { fullName, email, phone, password, country, referralCode } = req.body;
    if (!fullName || !email || !phone || !password || !country) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' });
    }

    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ success: false, message: 'Email already registered.' });

    const currencyInfo = countryCurrencyMap[country] || countryCurrencyMap['Default'];
    const newUser = new User({
      fullName,
      email,
      phone,
      password,
      country,
      currency: currencyInfo.currency,
      currencySymbol: currencyInfo.symbol,
      referralCode: generateReferralCode()
    });

    // Handle referral
    if (referralCode) {
      const referrer = await User.findOne({ referralCode: referralCode.toUpperCase() });
      if (referrer) {
        newUser.referredBy = referrer._id;
        referrer.walletBalance += REFERRAL_BONUS;
        referrer.referralEarnings += REFERRAL_BONUS;
        referrer.referralCount += 1;
        await referrer.save();

        await Transaction.create({
          user: referrer._id,
          type: 'referral_bonus',
          amount: REFERRAL_BONUS,
          currency: referrer.currency,
          method: 'system',
          reference: generateRef(),
          status: 'completed',
          note: `Referral bonus for inviting ${email}`
        });
      }
    }

    await newUser.save();
    const token = jwt.sign({ id: newUser._id, role: newUser.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      token,
      user: {
        id: newUser._id,
        fullName: newUser.fullName,
        email: newUser.email,
        role: newUser.role,
        currency: newUser.currency,
        currencySymbol: newUser.currencySymbol,
        walletBalance: newUser.walletBalance,
        referralCode: newUser.referralCode
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password are required.' });

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    if (user.isSuspended) return res.status(403).json({ success: false, message: 'Account suspended. Contact support.' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid email or password.' });

    user.lastLogin = new Date();
    await user.save();

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({
      success: true,
      message: 'Login successful.',
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        currency: user.currency,
        currencySymbol: user.currencySymbol,
        walletBalance: user.walletBalance,
        referralCode: user.referralCode
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
});

module.exports = router;
