import mongoose from 'mongoose';

const holidayConfigSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: 'default',
      unique: true,
    },
    heroBadge: {
      type: String,
      default: 'Special Holiday Offer',
    },
    title: {
      type: String,
      default: 'Mega Offer',
    },
    subtitle: {
      type: String,
      default:
        'Celebrate the season with amazing deals on your favorite products!',
    },
    discountPercent: {
      type: Number,
      default: 70,
    },
    endDate: {
      type: Date,
      default: () => new Date('2026-12-31T23:59:59'),
    },
    couponCode: {
      type: String,
      default: 'HOLIDAY10',
    },
    couponDescription: {
      type: String,
      default:
        'Use the code below at checkout and stack your savings on top of holiday prices.',
    },
    topDealsTitle: {
      type: String,
      default: 'Top Holiday Deals',
    },
    topDealsSubtitle: {
      type: String,
      default: 'Hand-picked favorites at their lowest prices of the year.',
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export const HolidayConfig = mongoose.model(
  'HolidayConfig',
  holidayConfigSchema
);

export const defaultHolidayConfig = () => ({
  heroBadge: 'Special Holiday Offer',
  title: 'Mega Offer',
  subtitle: 'Celebrate the season with amazing deals on your favorite products!',
  discountPercent: 70,
  endDate: '2026-12-31T23:59:59',
  couponCode: 'HOLIDAY10',
  couponDescription:
    'Use the code below at checkout and stack your savings on top of holiday prices.',
  topDealsTitle: 'Top Holiday Deals',
  topDealsSubtitle: "Hand-picked favorites at their lowest prices of the year.",
  active: true,
});

export default HolidayConfig;
