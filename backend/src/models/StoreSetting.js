import mongoose from 'mongoose';

const storeSettingSchema = new mongoose.Schema(
  {
    storeName: { type: String, default: '' },
    storeUrl: { type: String, default: '' },
    email: { type: String, default: '' },
    phone: { type: String, default: '' },
    description: { type: String, default: '' },
    // Logo can be shown two ways: as styled text (default) or an uploaded image.
    logoType: { type: String, enum: ['text', 'image'], default: 'text' },
    logoText: { type: String, default: '' },
    logoSubText: { type: String, default: '' },
    logoIconUrl: { type: String, default: '' },
    logoUrl: { type: String, default: '' },
    currency: { type: String, default: 'usd' },
    timezone: { type: String, default: 'pt' },
    address: { type: String, default: '' },
    // SEO metadata for global store pages
    metaTitle: { type: String, default: '' },
    metaDescription: { type: String, default: '' },
  },
  { timestamps: true }
);

const StoreSetting = mongoose.model('StoreSetting', storeSettingSchema);
export default StoreSetting;
