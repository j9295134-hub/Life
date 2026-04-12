const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['deposit', 'withdrawal', 'investment', 'return', 'referral_bonus'], required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'GHS' },
  method: { type: String, enum: ['mtn_momo', 'telecel_momo', 'airteltigo_momo', 'bank', 'system'], default: 'system' },
  accountDetails: {
    accountName: String,
    accountNumber: String,
    bankName: String,
    network: String
  },
  transactionId: { type: String, default: null },
  reference: { type: String, unique: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'completed'], default: 'pending' },
  note: { type: String, default: '' },
  adminNote: { type: String, default: '' },
  processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  processedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Transaction', transactionSchema);
