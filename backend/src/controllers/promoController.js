// backend/src/controllers/promoController.js

import PromoCode from '../models/PromoCode.js';
import Product from '../models/Product.js';
import { expandPromoCategories } from '../utils/categoryTree.js';

// @desc    Validate a promo code and compute the discount
// @route   POST /api/promo/validate
// @access  Public
export const validatePromo = async (req, res) => {
  try {
    const { code, subtotal = 0, items = [] } = req.body;

    if (!code || !code.trim()) {
      return res.status(400).json({ success: false, message: 'Promo code is required' });
    }

    const promo = await PromoCode.findOne({ code: code.trim().toUpperCase() });
    if (!promo) {
      return res.status(404).json({ success: false, message: 'Invalid promo code' });
    }

    // Resolve categories + price for each cart item from the DB.
    let promoItems = [];
    if (Array.isArray(items) && items.length > 0) {
      const ids = items.map((i) => i.product).filter(Boolean);
      const products = await Product.find({ _id: { $in: ids } }).populate('category');
      const byId = new Map(products.map((p) => [String(p._id), p]));
      promoItems = items.map((i) => {
        const product = byId.get(String(i.product));
        if (!product) return { categories: [], price: 0, quantity: i.quantity || 1 };
        const price = product.discountPrice > 0 ? product.discountPrice : product.price;
        const cats =
          Array.isArray(product.categories) && product.categories.length
            ? product.categories
            : product.category && typeof product.category === 'object' && product.category.name
              ? [product.category.name]
              : [];
        return {
          categories: cats,
          price,
          quantity: i.quantity || 1,
        };
      });
    }

    const expanded = await expandPromoCategories(promo.categories || []);
    const result = promo.computeItemDiscount(
      promoItems,
      Number(subtotal) || 0,
      expanded
    );

    if (!result.valid) {
      const messages = {
        inactive: 'This promo code is not active',
        'min-order': 'Order does not meet the minimum amount',
        'no-category':
          'This promo code only applies to specific categories in your cart',
      };
      return res.status(400).json({
        success: false,
        message:
          result.reason === 'no-category'
            ? `This promo code is only valid for: ${(
                promo.categories || []
              )
                .map((c) => String(c).trim())
                .filter(Boolean)
                .join(', ') || 'specific categories'}`
            : messages[result.reason] || 'This promo code cannot be applied',
        reason: result.reason,
        categories: promo.categories || [],
      });
    }

    res.json({
      success: true,
      promo: {
        code: promo.code,
        type: promo.type,
        value: promo.value,
        description: promo.description,
        minOrder: promo.minOrder,
        categories: promo.categories || [],
      },
      discount: result.discount,
      matchingSubtotal: result.matchingSubtotal,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all promo codes (paginated, filterable)
// @route   GET /api/promo
// @access  Private/Admin
export const getAllPromos = async (req, res) => {
  try {
    const { search, status, type, page = 1, limit = 10 } = req.query;

    const query = {};
    if (status) {
      query.status = status;
    }
    if (type) {
      query.type = type;
    }
    if (search) {
      query.$or = [
        { code: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await PromoCode.countDocuments(query);
    const promos = await PromoCode.find(query)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    res.json({
      success: true,
      count: promos.length,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      promos,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get promo stats
// @route   GET /api/promo/stats
// @access  Private/Admin
export const getPromoStats = async (req, res) => {
  try {
    const now = new Date();
    const inSevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const result = await PromoCode.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
          inactive: { $sum: { $cond: [{ $eq: ['$status', 'inactive'] }, 1, 0] } },
          totalRedemptions: { $sum: '$usageCount' },
        },
      },
    ]);

    const expiringSoon = await PromoCode.countDocuments({
      status: 'active',
      endDate: { $gte: now, $lte: inSevenDays },
    });

    const s = result[0] || {};
    res.json({
      success: true,
      stats: {
        total: s.total || 0,
        active: s.active || 0,
        inactive: s.inactive || 0,
        totalRedemptions: s.totalRedemptions || 0,
        expiringSoon,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create a promo code (Admin only)
// @route   POST /api/promo
// @access  Private/Admin
export const createPromo = async (req, res) => {
  try {
    const {
      code,
      description,
      type,
      value,
      minOrder,
      maxDiscount,
      maxUses,
      perUserLimit,
      startDate,
      endDate,
      status,
      categories,
    } = req.body;

    if (!code || !code.trim()) {
      return res.status(400).json({ success: false, message: 'Promo code is required' });
    }

    const promoType = type || 'percentage';
    const promoValue = Number(value) || 0;
    if (promoType === 'percentage' && (promoValue < 0 || promoValue > 100)) {
      return res
        .status(400)
        .json({ success: false, message: 'Percentage value must be between 0 and 100' });
    }
    if (promoValue < 0) {
      return res.status(400).json({ success: false, message: 'Value cannot be negative' });
    }

    const promo = new PromoCode({
      code: code.trim().toUpperCase(),
      description: description || '',
      type: promoType,
      value: promoValue,
      minOrder: Number(minOrder) || 0,
      maxDiscount: Number(maxDiscount) || 0,
      maxUses: Number(maxUses) || 0,
      perUserLimit: perUserLimit !== undefined ? Number(perUserLimit) : 1,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      status: status || 'active',
      categories: Array.isArray(categories) ? categories : [],
      createdBy: req.user._id,
    });

    await promo.save();
    res.status(201).json({ success: true, promo });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Promo code already exists' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update a promo code (Admin only)
// @route   PUT /api/promo/:id
// @access  Private/Admin
export const updatePromo = async (req, res) => {
  try {
    const promo = await PromoCode.findById(req.params.id);
    if (!promo) {
      return res.status(404).json({ success: false, message: 'Promo code not found' });
    }

    const {
      code,
      description,
      type,
      value,
      minOrder,
      maxDiscount,
      maxUses,
      perUserLimit,
      startDate,
      endDate,
      status,
      categories,
    } = req.body;

    if (code !== undefined && code.trim()) {
      promo.code = code.trim().toUpperCase();
    }
    if (description !== undefined) {
      promo.description = description;
    }
    if (type) {
      promo.type = type;
    }
    if (value !== undefined) {
      const promoValue = Number(value) || 0;
      if (promo.type === 'percentage' && (promoValue < 0 || promoValue > 100)) {
        return res
          .status(400)
          .json({ success: false, message: 'Percentage value must be between 0 and 100' });
      }
      promo.value = promoValue;
    }
    if (minOrder !== undefined) {
      promo.minOrder = Number(minOrder) || 0;
    }
    if (maxDiscount !== undefined) {
      promo.maxDiscount = Number(maxDiscount) || 0;
    }
    if (maxUses !== undefined) {
      promo.maxUses = Number(maxUses) || 0;
    }
    if (perUserLimit !== undefined) {
      promo.perUserLimit = Number(perUserLimit) || 1;
    }
    if (startDate !== undefined) {
      promo.startDate = startDate ? new Date(startDate) : null;
    }
    if (endDate !== undefined) {
      promo.endDate = endDate ? new Date(endDate) : null;
    }
    if (status) {
      promo.status = status;
    }
    if (categories !== undefined) {
      promo.categories = Array.isArray(categories) ? categories : [];
    }

    await promo.save();
    res.json({ success: true, promo });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Promo code already exists' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete a promo code (Admin only)
// @route   DELETE /api/promo/:id
// @access  Private/Admin
export const deletePromo = async (req, res) => {
  try {
    const promo = await PromoCode.findByIdAndDelete(req.params.id);
    if (!promo) {
      return res.status(404).json({ success: false, message: 'Promo code not found' });
    }
    res.json({ success: true, message: 'Promo code deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
