import { HolidayConfig, defaultHolidayConfig } from '../models/HolidayConfig.js';

// Public: returns the current holiday config (or defaults if not yet set)
export const getHolidayConfig = async (req, res) => {
  try {
    const config = await HolidayConfig.findOne({ key: 'default' });
    if (!config) {
      return res.json({ success: true, config: defaultHolidayConfig() });
    }
    return res.json({ success: true, config });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Admin: create or update the holiday config (singleton document)
export const updateHolidayConfig = async (req, res) => {
  try {
    const {
      heroBadge,
      title,
      subtitle,
      discountPercent,
      endDate,
      couponCode,
      couponDescription,
      topDealsTitle,
      topDealsSubtitle,
      active,
    } = req.body;

    const update = {};
    if (heroBadge !== undefined) update.heroBadge = heroBadge;
    if (title !== undefined) update.title = title;
    if (subtitle !== undefined) update.subtitle = subtitle;
    if (discountPercent !== undefined) {
      update.discountPercent = Number(discountPercent) || 0;
    }
    if (endDate !== undefined) {
      update.endDate = endDate ? new Date(endDate) : null;
    }
    if (couponCode !== undefined) update.couponCode = couponCode;
    if (couponDescription !== undefined) {
      update.couponDescription = couponDescription;
    }
    if (topDealsTitle !== undefined) update.topDealsTitle = topDealsTitle;
    if (topDealsSubtitle !== undefined) {
      update.topDealsSubtitle = topDealsSubtitle;
    }
    if (active !== undefined) {
      update.active = active === true || active === 'true';
    }

    const config = await HolidayConfig.findOneAndUpdate(
      { key: 'default' },
      { $set: update },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.json({ success: true, config });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
