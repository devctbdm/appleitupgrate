import mongoose from 'mongoose';

const offerSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      index: true,
    },
    shortDescription: { type: String, default: '' },
    fullDescription: { type: String, default: '' }, // HTML from the rich text editor
    image: { type: String, default: '' },
    startDate: { type: Date },
    endDate: { type: Date },
    active: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

const slugifyText = (text) =>
  String(text)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

offerSchema.pre('save', function () {
  if (this.isModified('title') || !this.slug) {
    this.slug = slugifyText(this.title) || `offer-${Date.now()}`;
  }
});

export default mongoose.models.Offer || mongoose.model('Offer', offerSchema);
