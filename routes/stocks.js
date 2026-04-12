const express = require('express');
const router = express.Router();
const Stock = require('../models/Stock');
const { protect, adminOnly } = require('../middleware/auth');
const { upload, cloudinary } = require('../middleware/cloudinary');

// GET /api/stocks - public
router.get('/', async (req, res) => {
  try {
    const { category, featured } = req.query;
    const filter = { isActive: true };
    if (category) filter.category = category;
    if (featured === 'true') filter.isFeatured = true;
    const stocks = await Stock.find(filter).sort({ isFeatured: -1, createdAt: -1 });
    res.json({ success: true, stocks });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// GET /api/stocks/:id - public
router.get('/:id', async (req, res) => {
  try {
    const stock = await Stock.findById(req.params.id);
    if (!stock || !stock.isActive) return res.status(404).json({ success: false, message: 'Stock not found.' });
    res.json({ success: true, stock });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// POST /api/stocks - admin
router.post('/', protect, adminOnly, upload.single('image'), async (req, res) => {
  try {
    const { name, category, description, price, duration, durationUnit, roiPercentage, totalSlots, riskLevel, isFeatured } = req.body;
    const stock = new Stock({
      name, category, description,
      price: parseFloat(price),
      duration: parseInt(duration),
      durationUnit: durationUnit || 'days',
      roiPercentage: parseFloat(roiPercentage),
      totalSlots: totalSlots ? parseInt(totalSlots) : null,
      riskLevel: riskLevel || 'Low',
      isFeatured: isFeatured === 'true',
      image: req.file ? req.file.path : null,         // Cloudinary URL
      imagePublicId: req.file ? req.file.filename : null
    });
    await stock.save();
    res.status(201).json({ success: true, message: 'Stock created.', stock });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// PUT /api/stocks/:id - admin
router.put('/:id', protect, adminOnly, upload.single('image'), async (req, res) => {
  try {
    const updates = { ...req.body, updatedAt: new Date() };
    if (req.file) {
      // Delete old image from Cloudinary if exists
      const old = await Stock.findById(req.params.id);
      if (old?.imagePublicId) {
        await cloudinary.uploader.destroy(old.imagePublicId).catch(() => {});
      }
      updates.image = req.file.path;
      updates.imagePublicId = req.file.filename;
    }
    if (updates.price) updates.price = parseFloat(updates.price);
    if (updates.duration) updates.duration = parseInt(updates.duration);
    if (updates.roiPercentage) updates.roiPercentage = parseFloat(updates.roiPercentage);
    const stock = await Stock.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!stock) return res.status(404).json({ success: false, message: 'Stock not found.' });
    res.json({ success: true, message: 'Stock updated.', stock });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// DELETE /api/stocks/:id - admin
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const stock = await Stock.findById(req.params.id);
    if (stock?.imagePublicId) {
      await cloudinary.uploader.destroy(stock.imagePublicId).catch(() => {});
    }
    await Stock.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true, message: 'Stock deactivated.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
