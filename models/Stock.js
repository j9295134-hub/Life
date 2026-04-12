const mongoose = require('mongoose');

const stockSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  category: { type: String, enum: ['Animals', 'Food Farms'], required: true },
  description: { type: String, required: true },
  image: { type: String, default: null },
  imagePublicId: { type: String, default: null },
  price: { type: Number, required: true, min: 0 },
  duration: { type: Number, required: true, min: 1 },
  durationUnit: { type: String, enum: ['hours', 'days', 'weeks', 'months'], default: 'days' },
  roiPercentage: { type: Number, required: true, min: 0 },
  totalSlots: { type: Number, default: null },
  usedSlots: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  isFeatured: { type: Boolean, default: false },
  riskLevel: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Low' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

stockSchema.virtual('totalReturn').get(function () {
  return this.price + (this.price * this.roiPercentage) / 100;
});

stockSchema.virtual('durationLabel').get(function () {
  return `${this.duration} ${this.durationUnit}`;
});

module.exports = mongoose.model('Stock', stockSchema);
