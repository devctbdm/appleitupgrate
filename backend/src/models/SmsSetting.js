import mongoose from 'mongoose';

const smsSettingSchema = new mongoose.Schema(
  {
    provider: { type: String, enum: ['bulksmsbd', 'rtcom'], default: 'bulksmsbd' },
    apiKey: { type: String, default: '' },
    gatewayUrl: { type: String, default: '' },
    gatewayApiKey: { type: String, default: '' },
    gatewayApiKeyVariable: { type: String, default: 'api_key' },
    gatewaySmsType: { type: String, enum: ['url'], default: 'url' },
    senderId: { type: String, default: '' },
    signature: { type: String, default: '' },
    enabled: { type: Boolean, default: false },
    twoFactorEnabled: { type: Boolean, default: false },
    otpExpirySeconds: { type: Number, default: 60, min: 15, max: 900 },
  },
  { timestamps: true }
);

const SmsSetting = mongoose.model('SmsSetting', smsSettingSchema);

export async function getSmsSetting() {
  let setting = await SmsSetting.findOne();
  if (!setting) {
    setting = await SmsSetting.create({});
  }
  return setting;
}

export default SmsSetting;
