import SavedBuild from '../models/SavedBuild.js';
import Product from '../models/Product.js';

// @desc    List the current user's saved builds
// @route   GET /api/pc-builder/builds
// @access  Private
export const getMyBuilds = async (req, res) => {
  try {
    const builds = await SavedBuild.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(100);
    res.json({ success: true, builds });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Save / update a build for the current user
// @route   POST /api/pc-builder/builds
// @access  Private
export const saveBuild = async (req, res) => {
  try {
    const { name, components } = req.body;
    if (!components || typeof components !== 'object') {
      return res.status(400).json({ success: false, message: 'components are required' });
    }

    // Only keep full/valid entries and derive fresh price + wattage from the DB
    // so a client can't store arbitrary/incorrect totals.
    const productIds = Object.values(components)
      .map((c) => c && c.product)
      .filter(Boolean);

    const products = await Product.find({ _id: { $in: productIds } }).select(
      'name price discountPrice images brand pcPart stock status'
    );
    const byId = new Map(products.map((p) => [String(p._id), p]));

    const clean = {};
    for (const [slot, entry] of Object.entries(components)) {
      if (!entry || !entry.product) continue;
      const prod = byId.get(String(entry.product));
      if (!prod) continue;
      const effectivePrice =
        prod.discountPrice > 0 ? prod.discountPrice : prod.price;
      clean[slot] = {
        product: prod._id,
        name: prod.name,
        image: prod.images?.[0] || '',
        price: effectivePrice,
        wattage: prod.pcPart?.wattage || 0,
      };
    }

    const data = {
      user: req.user._id,
      name: typeof name === 'string' && name.trim() ? name.trim() : 'My PC Build',
      components: clean,
    };

    const build = await SavedBuild.create(data);
    res.status(201).json({ success: true, build });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete one of the user's saved builds
// @route   DELETE /api/pc-builder/builds/:id
// @access  Private
export const deleteBuild = async (req, res) => {
  try {
    const build = await SavedBuild.findOne({
      _id: req.params.id,
      user: req.user._id,
    });
    if (!build) {
      return res.status(404).json({ success: false, message: 'Build not found' });
    }
    await build.deleteOne();
    res.json({ success: true, message: 'Build deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
