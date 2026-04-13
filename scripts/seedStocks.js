require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const { cloudinary } = require('../middleware/cloudinary');
const Stock = require('../models/Stock');

// Professional Unsplash images — specific photo IDs for each crop/livestock
const stocks = [
  {
    name: 'Vegetable Farm Batch',
    category: 'Food Farms',
    description: 'A diversified seasonal vegetable farm pool producing fresh tomatoes, peppers, leafy greens, and herbs across managed plots. Steady short-cycle returns backed by local market demand.',
    imageUrl: 'https://images.unsplash.com/photo-1574943320219-553eb213f72d?auto=format&fit=crop&w=800&h=600&q=85',
    price: 50,
    duration: 7,
    durationUnit: 'days',
    roiPercentage: 10,
    riskLevel: 'Low',
    totalSlots: 500,
    isFeatured: false
  },
  {
    name: 'Poultry Layer Cycle',
    category: 'Animals',
    description: 'Investment in a commercial egg-laying poultry unit. Hens are professionally managed with biosecure housing, automated feeding, and veterinary oversight. Egg output is sold to supermarkets and institutional buyers.',
    imageUrl: 'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?auto=format&fit=crop&w=800&h=600&q=85',
    price: 100,
    duration: 14,
    durationUnit: 'days',
    roiPercentage: 15,
    riskLevel: 'Low',
    totalSlots: 300,
    isFeatured: false
  },
  {
    name: 'Tomato Harvest Pool',
    category: 'Food Farms',
    description: 'A focused tomato cultivation pool operating under drip-irrigation systems in fertile lowland soils. Harvest cycles are tightly managed for peak market timing and maximum yield per plot.',
    imageUrl: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=800&h=600&q=85',
    price: 150,
    duration: 10,
    durationUnit: 'days',
    roiPercentage: 12,
    riskLevel: 'Low',
    totalSlots: 400,
    isFeatured: true
  },
  {
    name: 'Maize Season Batch',
    category: 'Food Farms',
    description: 'Seasonal maize cultivation on large-scale farmland with mechanized planting and harvesting. Produce is sold to flour mills, animal feed manufacturers, and commodity traders under offtake agreements.',
    imageUrl: 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&w=800&h=600&q=85',
    price: 300,
    duration: 30,
    durationUnit: 'days',
    roiPercentage: 20,
    riskLevel: 'Low',
    totalSlots: 250,
    isFeatured: true
  },
  {
    name: 'Catfish Farm Unit',
    category: 'Animals',
    description: 'Managed catfish aquaculture in earthen and concrete pond systems. Fish are raised to market size (500g–1kg) under supervised feeding and water quality programs, then sold to processors and open markets.',
    imageUrl: 'https://images.unsplash.com/photo-1564767609342-620cb19b2357?auto=format&fit=crop&w=800&h=600&q=85',
    price: 500,
    duration: 21,
    durationUnit: 'days',
    roiPercentage: 18,
    riskLevel: 'Medium',
    totalSlots: 200,
    isFeatured: false
  },
  {
    name: 'Soybean Harvest Pool',
    category: 'Food Farms',
    description: 'Commercial soybean farming on certified organic plots. Beans are harvested, processed, and exported to edible oil manufacturers and livestock feed companies. Strong global demand supports consistent pricing.',
    imageUrl: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=800&h=600&q=85',
    price: 500,
    duration: 45,
    durationUnit: 'days',
    roiPercentage: 25,
    riskLevel: 'Medium',
    totalSlots: 150,
    isFeatured: false
  },
  {
    name: 'Cocoa Export Batch',
    category: 'Food Farms',
    description: 'Premium cocoa bean farming on certified estates in the forest belt. Beans are sun-dried, graded, and exported to European chocolate manufacturers. Backed by international commodity pricing and forward contracts.',
    imageUrl: 'https://images.unsplash.com/photo-1606312619070-d48b4c7b59f3?auto=format&fit=crop&w=800&h=600&q=85',
    price: 1000,
    duration: 60,
    durationUnit: 'days',
    roiPercentage: 30,
    riskLevel: 'Medium',
    totalSlots: 100,
    isFeatured: true
  },
  {
    name: 'Broiler Farm Package',
    category: 'Animals',
    description: 'Fast-cycle broiler chicken production in climate-controlled housing. Birds reach market weight (2–2.5kg) in 4–6 weeks. Sold to hotels, restaurants, and retail chains under fixed supply contracts.',
    imageUrl: 'https://images.unsplash.com/photo-1634176866089-b0b7db3a9c92?auto=format&fit=crop&w=800&h=600&q=85',
    price: 2000,
    duration: 30,
    durationUnit: 'days',
    roiPercentage: 28,
    riskLevel: 'Medium',
    totalSlots: 80,
    isFeatured: false
  },
  {
    name: 'Rice Paddy Season',
    category: 'Food Farms',
    description: 'Large-scale irrigated rice cultivation across lowland paddies. Rice is milled on-site and distributed to national food distributors and government procurement programs. A high-volume, steady-demand commodity.',
    imageUrl: 'https://images.unsplash.com/photo-1536657464919-892534f60d6e?auto=format&fit=crop&w=800&h=600&q=85',
    price: 5000,
    duration: 90,
    durationUnit: 'days',
    roiPercentage: 35,
    riskLevel: 'High',
    totalSlots: 50,
    isFeatured: false
  },
  {
    name: 'Cashew Export Pool',
    category: 'Food Farms',
    description: 'Premium raw cashew nut farming on established orchards in the savanna belt. Nuts are processed, graded to W240/W320 international standards, and exported to Asian and European buyers. Our highest-yield, long-cycle offering.',
    imageUrl: 'https://images.unsplash.com/photo-1595981267035-7b04ca84a82d?auto=format&fit=crop&w=800&h=600&q=85',
    price: 10000,
    duration: 120,
    durationUnit: 'days',
    roiPercentage: 40,
    riskLevel: 'High',
    totalSlots: 30,
    isFeatured: true
  }
];

async function uploadImage(url, name) {
  try {
    console.log(`  Uploading image for "${name}"...`);
    const result = await cloudinary.uploader.upload(url, {
      folder: 'agriclife/stocks',
      transformation: [{ width: 800, height: 600, crop: 'fill', quality: 'auto', fetch_format: 'auto' }],
      public_id: 'stock_' + name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
    });
    console.log(`  ✓ Uploaded: ${result.secure_url}`);
    return { url: result.secure_url, publicId: result.public_id };
  } catch (err) {
    console.warn(`  ✗ Image upload failed for "${name}": ${err.message}`);
    return { url: null, publicId: null };
  }
}

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('MongoDB connected.\n');

  const existing = await Stock.countDocuments();
  if (existing > 0) {
    console.log(`Found ${existing} existing stock(s). Skipping already-existing names.\n`);
  }

  for (const s of stocks) {
    const exists = await Stock.findOne({ name: s.name });
    if (exists) {
      console.log(`[SKIP] "${s.name}" already exists.`);
      continue;
    }

    console.log(`[ADDING] "${s.name}"`);
    const { url, publicId } = await uploadImage(s.imageUrl, s.name);

    await Stock.create({
      name: s.name,
      category: s.category,
      description: s.description,
      image: url,
      imagePublicId: publicId,
      price: s.price,
      duration: s.duration,
      durationUnit: s.durationUnit,
      roiPercentage: s.roiPercentage,
      riskLevel: s.riskLevel,
      totalSlots: s.totalSlots,
      isFeatured: s.isFeatured,
      isActive: true
    });

    console.log(`  ✓ Stock created.\n`);
  }

  console.log('Seed complete.');
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch(err => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
