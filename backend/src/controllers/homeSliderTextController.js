// backend/src/controllers/homeSliderTextController.js

import HomeSliderText from '../models/HomeSliderText.js';

// @desc    Get all home slider texts (active first for storefront, admin sees all)
// @route   GET /api/home-slider-texts
// @access  Public
export const getAllHomeSliderTexts = async (req, res) => {
  try {
    const { active } = req.query;
    const query = {};
    if (active === 'true') query.active = true;

    const texts = await HomeSliderText.find(query).sort({ sortOrder: 1, createdAt: 1 });
    res.json({ success: true, texts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single home slider text
// @route   GET /api/home-slider-texts/:id
// @access  Public
export const getHomeSliderTextById = async (req, res) => {
  try {
    const text = await HomeSliderText.findById(req.params.id);
    if (!text) {
      return res.status(404).json({ success: false, message: 'Text not found' });
    }
    res.json({ success: true, text });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create a home slider text
// @route   POST /api/home-slider-texts
// @access  Private/Admin
export const createHomeSliderText = async (req, res) => {
  try {
    const { text, active, sortOrder } = req.body;

    const doc = new HomeSliderText({
      text: text || '',
      active: active !== undefined ? !!active : true,
      sortOrder: sortOrder || 0,
      createdBy: req.user?._id,
    });

    await doc.save();
    res.status(201).json({ success: true, text: doc });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update a home slider text
// @route   PUT /api/home-slider-texts/:id
// @access  Private/Admin
export const updateHomeSliderText = async (req, res) => {
  try {
    const doc = await HomeSliderText.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Text not found' });
    }

    const { text, active, sortOrder } = req.body;
    if (text !== undefined) doc.text = text;
    if (active !== undefined) doc.active = !!active;
    if (sortOrder !== undefined) doc.sortOrder = sortOrder;

    await doc.save();
    res.json({ success: true, text: doc });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete a home slider text
// @route   DELETE /api/home-slider-texts/:id
// @access  Private/Admin
export const deleteHomeSliderText = async (req, res) => {
  try {
    const doc = await HomeSliderText.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Text not found' });
    }

    await doc.deleteOne();
    res.json({ success: true, message: 'Text deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Reorder home slider texts
// @route   PUT /api/home-slider-texts/reorder
// @access  Private/Admin
export const reorderHomeSliderTexts = async (req, res) => {
  try {
    const { orders } = req.body;
    if (!Array.isArray(orders)) {
      return res.status(400).json({ success: false, message: 'Orders must be an array' });
    }

    for (const { id, sortOrder } of orders) {
      await HomeSliderText.findByIdAndUpdate(id, { sortOrder });
    }

    res.json({ success: true, message: 'Texts reordered' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
