import mongoose from 'mongoose';

const storeSettingSchema = new mongoose.Schema(
  {
    storeName: { type: String, default: '' },
    storeUrl: { type: String, default: '' },
    email: { type: String, default: '' },
    phone: { type: String, default: '' },
    description: { type: String, default: '' },
    logoUrl: { type: String, default: '' },
    currency: { type: String, default: 'usd' },
    timezone: { type: String, default: 'pt' },
    address: { type: String, default: '' },
  },
  { timestamps: true }
);

const StoreSetting = mongoose.model('StoreSetting', storeSettingSchema);
export default StoreSetting;
