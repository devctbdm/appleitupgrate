// backend/src/controllers/sliderController.js

import Slider from '../models/Slider.js';
import { cloudinary } from '../middleware/upload.js';

// @desc    Get all slides (active first for storefront, admin sees all)
// @route   GET /api/sliders
// @access  Public
export const getAllSliders = async (req, res) => {
  try {
    const { active } = req.query;
    const query = {};
    if (active === 'true') query.active = true;

    const sliders = await Slider.find(query).sort({ type: 1, sortOrder: 1 });
    res.json({ success: true, sliders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single slide
// @route   GET /api/sliders/:id
// @access  Public
export const getSliderById = async (req, res) => {
  try {
    const slider = await Slider.findById(req.params.id);
    if (!slider) {
      return res.status(404).json({ success: false, message: 'Slide not found' });
    }
    res.json({ success: true, slider });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create a new slide
// @route   POST /api/sliders
// @access  Private/Admin
export const createSlider = async (req, res) => {
  try {
    const { title, description, link, type, active, sortOrder, image } = req.body;
    const uploadedImage = req.file?.path || image || '';

    const slider = new Slider({
      title: title || '',
      description: description || '',
      link: link || '',
      image: uploadedImage,
      type: type || 'hero',
      active: active !== undefined ? !!active : true,
      sortOrder: sortOrder || 0,
      createdBy: req.user?._id,
    });

    await slider.save();
    res.status(201).json({ success: true, slider });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update a slide
// @route   PUT /api/sliders/:id
// @access  Private/Admin
export const updateSlider = async (req, res) => {
  try {
    const slider = await Slider.findById(req.params.id);
    if (!slider) {
      return res.status(404).json({ success: false, message: 'Slide not found' });
    }

    const { title, description, link, type, active, sortOrder, image } = req.body;

    if (title !== undefined) slider.title = title;
    if (description !== undefined) slider.description = description;
    if (link !== undefined) slider.link = link;
    if (type !== undefined) slider.type = type;
    if (active !== undefined) slider.active = !!active;
    if (sortOrder !== undefined) slider.sortOrder = sortOrder;

    if (req.file?.path) {
      if (slider.image?.includes('cloudinary')) {
        const publicId = slider.image.split('/').pop()?.split('.')[0];
        if (publicId) {
          try {
            await cloudinary.uploader.destroy(`apple-it-zone/sliders/${publicId}`);
          } catch (err) {
            console.warn('Could not delete old slider image:', err.message);
          }
        }
      }
      slider.image = req.file.path;
    } else if (image !== undefined) {
      slider.image = image;
    }

    await slider.save();
    res.json({ success: true, slider });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete a slide
// @route   DELETE /api/sliders/:id
// @access  Private/Admin
export const deleteSlider = async (req, res) => {
  try {
    const slider = await Slider.findById(req.params.id);
    if (!slider) {
      return res.status(404).json({ success: false, message: 'Slide not found' });
    }

    if (slider.image?.includes('cloudinary')) {
      const publicId = slider.image.split('/').pop()?.split('.')[0];
      if (publicId) {
        try {
          await cloudinary.uploader.destroy(`apple-it-zone/sliders/${publicId}`);
        } catch (err) {
          console.warn('Could not delete slider image:', err.message);
        }
      }
    }

    await slider.deleteOne();
    res.json({ success: true, message: 'Slide deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Reorder slides
// @route   PUT /api/sliders/reorder
// @access  Private/Admin
export const reorderSliders = async (req, res) => {
  try {
    const { orders } = req.body;
    if (!Array.isArray(orders)) {
      return res.status(400).json({ success: false, message: 'Orders must be an array' });
    }

    for (const { id, sortOrder } of orders) {
      await Slider.findByIdAndUpdate(id, { sortOrder });
    }

    res.json({ success: true, message: 'Slides reordered' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
