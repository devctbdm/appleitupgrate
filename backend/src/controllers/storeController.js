import StoreSetting from '../models/StoreSetting.js';

export const getStoreSettings = async (req, res) => {
  try {
    let settings = await StoreSetting.findOne();
    if (!settings) {
      settings = await StoreSetting.create({});
    }
    res.json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Public store info for storefront footer/header (no auth required)
export const getPublicStoreSettings = async (req, res) => {
  try {
    let settings = await StoreSetting.findOne();
    if (!settings) {
      settings = await StoreSetting.create({});
    }
    res.json({
      success: true,
      settings: {
        storeName: settings.storeName,
        storeUrl: settings.storeUrl,
        email: settings.email,
        phone: settings.phone,
        description: settings.description,
        logoType: settings.logoType,
        logoText: settings.logoText,
        logoSubText: settings.logoSubText,
        logoIconUrl: settings.logoIconUrl,
        logoUrl: settings.logoUrl,
        currency: settings.currency,
        timezone: settings.timezone,
        address: settings.address,
        metaTitle: settings.metaTitle,
        metaDescription: settings.metaDescription,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateStoreSettings = async (req, res) => {
  try {
    const {
      storeName,
      storeUrl,
      email,
      phone,
      description,
      logoType,
      logoText,
      logoSubText,
      logoIconUrl,
      logoUrl,
      currency,
      timezone,
      address,
      metaTitle,
      metaDescription,
    } = req.body;
    let settings = await StoreSetting.findOne();
    if (!settings) {
      settings = new StoreSetting();
    }
    if (storeName !== undefined) settings.storeName = storeName;
    if (storeUrl !== undefined) settings.storeUrl = storeUrl;
    if (email !== undefined) settings.email = email;
    if (phone !== undefined) settings.phone = phone;
    if (description !== undefined) settings.description = description;
    if (logoType !== undefined) settings.logoType = logoType === 'image' ? 'image' : 'text';
    if (logoText !== undefined) settings.logoText = logoText;
    if (logoSubText !== undefined) settings.logoSubText = logoSubText;
    if (logoIconUrl !== undefined) settings.logoIconUrl = logoIconUrl;
    if (logoUrl !== undefined) settings.logoUrl = logoUrl;
    if (currency !== undefined) settings.currency = currency;
    if (timezone !== undefined) settings.timezone = timezone;
    if (address !== undefined) settings.address = address;
    if (metaTitle !== undefined) settings.metaTitle = metaTitle;
    if (metaDescription !== undefined) settings.metaDescription = metaDescription;
    await settings.save();
    res.json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
