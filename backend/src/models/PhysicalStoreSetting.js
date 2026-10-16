import mongoose from 'mongoose';

const physicalStoreSettingSchema = new mongoose.Schema(
  {
    // Master show/hide for the home page banner
    enabled: { type: Boolean, default: true },
    // Banner copy
    title: { type: String, default: 'Physical Stores', trim: true },
    subtitle: {
      type: String,
      default: 'Visit Our Store & Get Your Desired IT Product!',
      trim: true,
    },
    buttonLabel: { type: String, default: 'Find Our Stores', trim: true },
    buttonLink: { type: String, default: '/physical-stores', trim: true },
    // Rich-text description shown in the bottom section of the stores page
    description: { type: String, default: '' },
    // Optional banner background image
    bannerUrl: { type: String, default: '' },
    // Dynamic count (e.g. "5+ Physical Stores")
    showCount: { type: Boolean, default: true },
    countSuffix: { type: String, default: '+', trim: true, maxlength: 4 },
  },
  { timestamps: true }
);

const PhysicalStoreSetting = mongoose.model(
  'PhysicalStoreSetting',
  physicalStoreSettingSchema
);

export async function getPhysicalStoreSetting() {
  let setting = await PhysicalStoreSetting.findOne();
  if (!setting) {
    setting = await PhysicalStoreSetting.create({});
  }
  return setting;
}

export default PhysicalStoreSetting;
