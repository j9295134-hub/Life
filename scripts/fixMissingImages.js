require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const { cloudinary } = require('../middleware/cloudinary');
const Stock = require('../models/Stock');

const fixes = [
  {
    name: 'Catfish Farm Unit',
    imageUrl: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=800&h=600&q=85'
  },
  {
    name: 'Cocoa Export Batch',
    imageUrl: 'https://images.unsplash.com/photo-1519996409144-56c88c6e40c5?auto=format&fit=crop&w=800&h=600&q=85'
  },
  {
    name: 'Broiler Farm Package',
    imageUrl: 'https://images.unsplash.com/photo-1516467508483-a7212febe31a?auto=format&fit=crop&w=800&h=600&q=85'
  }
];

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('MongoDB connected.\n');

  for (const fix of fixes) {
    console.log(`[FIXING] "${fix.name}"`);
    try {
      const publicId = 'stock_' + fix.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
      const result = await cloudinary.uploader.upload(fix.imageUrl, {
        folder: 'agriclife/stocks',
        transformation: [{ width: 800, height: 600, crop: 'fill', quality: 'auto', fetch_format: 'auto' }],
        public_id: publicId,
        overwrite: true
      });
      await Stock.updateOne({ name: fix.name }, { image: result.secure_url, imagePublicId: result.public_id });
      console.log(`  ✓ Updated: ${result.secure_url}\n`);
    } catch (err) {
      console.error(`  ✗ Failed: ${err.message}\n`);
    }
  }

  console.log('Done.');
  await mongoose.disconnect();
  process.exit(0);
}

run().catch(err => { console.error(err.message); process.exit(1); });
