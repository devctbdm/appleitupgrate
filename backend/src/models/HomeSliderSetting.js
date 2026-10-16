import mongoose from 'mongoose';

const homeSliderSettingSchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const HomeSliderSetting = mongoose.model(
  'HomeSliderSetting',
  homeSliderSettingSchema
);

// Singleton accessor — creates the settings row on first access.
export async function getHomeSliderSetting() {
  let setting = await HomeSliderSetting.findOne();
  if (!setting) {
    setting = await HomeSliderSetting.create({});
  }
  return setting;
}

export default HomeSliderSetting;
