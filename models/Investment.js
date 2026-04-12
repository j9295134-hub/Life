const mongoose = require('mongoose');

const investmentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  stock: { type: mongoose.Schema.Types.ObjectId, ref: 'Stock', required: true },
  stockSnapshot: {
    name: String,
    category: String,
    image: String,
    price: Number,
    duration: Number,
    durationUnit: String,
    roiPercentage: Number
  },
  amountInvested: { type: Number, required: true },
  roiAmount: { type: Number, required: true },
  totalReturn: { type: Number, required: true },
  startDate: { type: Date, default: Date.now },
  endDate: { type: Date, required: true },
  status: { type: String, enum: ['active', 'matured', 'completed', 'cancelled'], default: 'active' },
  creditedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Investment', investmentSchema);
