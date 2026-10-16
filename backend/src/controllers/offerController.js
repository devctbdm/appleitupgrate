import Offer from '../models/Offer.js';
import { cloudinary } from '../middleware/upload.js';

const getCloudinaryPublicId = (url = '') => {
  if (!url) return null;
  try {
    const file = url.split('/').pop().split('.')[0];
    return `apple-it-zone/offers/${file}`;
  } catch {
    return null;
  }
};

const toDate = (value) => (value ? new Date(value) : undefined);

// @desc    List offers (public)
// @route   GET /api/offers
// @access  Public
export const getAllOffers = async (req, res) => {
  try {
    const filter = {};
    if (req.query.active === 'true') filter.active = true;
    let query = Offer.find(filter).sort({ createdAt: -1 });
    const limit = parseInt(req.query.limit);
    if (limit > 0) query = query.limit(limit);
    const offers = await query.exec();
    res.json({ success: true, offers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get offer by slug (public)
// @route   GET /api/offers/slug/:slug
// @access  Public
export const getOfferBySlug = async (req, res) => {
  try {
    const offer = await Offer.findOne({ slug: req.params.slug });
    if (!offer) {
      return res.status(404).json({ success: false, message: 'Offer not found' });
    }
    res.json({ success: true, offer });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get offer by id (public)
// @route   GET /api/offers/:id
// @access  Public
export const getOfferById = async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id);
    if (!offer) {
      return res.status(404).json({ success: false, message: 'Offer not found' });
    }
    res.json({ success: true, offer });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create offer (admin)
// @route   POST /api/offers
// @access  Private/Admin
export const createOffer = async (req, res) => {
  try {
    const { title, shortDescription, fullDescription, startDate, endDate, active } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Title is required' });
    }
    const offer = new Offer({
      title: title.trim(),
      shortDescription: shortDescription || '',
      fullDescription: fullDescription || '',
      image: req.file ? req.file.path : '',
      startDate: toDate(startDate),
      endDate: toDate(endDate),
      active: active === 'true' || active === true,
      createdBy: req.user._id,
    });
    await offer.save();
    res.status(201).json({ success: true, offer });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update offer (admin)
// @route   PUT /api/offers/:id
// @access  Private/Admin
export const updateOffer = async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id);
    if (!offer) {
      return res.status(404).json({ success: false, message: 'Offer not found' });
    }

    const { title, shortDescription, fullDescription, startDate, endDate, active, removeImage } = req.body;
    if (title !== undefined) offer.title = title;
    if (shortDescription !== undefined) offer.shortDescription = shortDescription;
    if (fullDescription !== undefined) offer.fullDescription = fullDescription;
    if (startDate !== undefined)
      offer.startDate = startDate ? toDate(startDate) : null;
    if (endDate !== undefined) offer.endDate = endDate ? toDate(endDate) : null;
    if (active !== undefined) offer.active = active === 'true' || active === true;

    if (removeImage === 'true') {
      const oldId = getCloudinaryPublicId(offer.image);
      if (oldId) {
        try {
          await cloudinary.uploader.destroy(oldId);
        } catch {
          /* ignore */
        }
      }
      offer.image = '';
    }

    if (req.file) {
      const oldId = getCloudinaryPublicId(offer.image);
      if (oldId) {
        try {
          await cloudinary.uploader.destroy(oldId);
        } catch {
          /* ignore */
        }
      }
      offer.image = req.file.path;
    }

    await offer.save();
    res.json({ success: true, offer });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete offer (admin)
// @route   DELETE /api/offers/:id
// @access  Private/Admin
export const deleteOffer = async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id);
    if (!offer) {
      return res.status(404).json({ success: false, message: 'Offer not found' });
    }
    const oldId = getCloudinaryPublicId(offer.image);
    if (oldId) {
      try {
        await cloudinary.uploader.destroy(oldId);
      } catch {
        /* ignore */
      }
    }
    await offer.deleteOne();
    res.json({ success: true, message: 'Offer deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
