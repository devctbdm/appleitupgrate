import mongoose from 'mongoose';
import slugify from 'slugify';

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a product name'],
      trim: true,
      maxlength: [200, 'Name cannot be more than 200 characters'],
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
    },
    description: {
      type: String,
      required: [true, 'Please provide a product description'],
      trim: true,
    },
    price: {
      type: Number,
      required: [true, 'Please provide a product price'],
      min: [0, 'Price cannot be negative'],
    },
    discountPrice: {
      type: Number,
      default: 0,
      min: [0, 'Discount price cannot be negative'],
    },
    costPrice: {
      type: Number,
      default: 0,
      min: [0, 'Cost price cannot be negative'],
    },
    sku: {
      type: String,
      trim: true,
    },
    productCode: {
      type: String,
      trim: true,
    },
    brand: {
      type: String,
      trim: true,
      index: true,
    },
    category: {
      type: String,
      required: [true, 'Please provide a category'],
      trim: true,
    },
    categories: {
      type: [String],
      default: [],
      validate: {
        validator: (v) =>
          !v || v.length === 0 || v.every((c) => typeof c === 'string' && c.trim().length > 0),
        message: 'Categories must be a non-empty string array',
      },
    },
    images: {
      type: [String],
      required: [true, 'Please provide at least one image'],
      validate: {
        validator: (v) => v && v.length > 0,
        message: 'At least one image is required',
      },
    },
    imageAlts: {
      type: [String],
      default: [],
    },
    stock: {
      type: Number,
      required: [true, 'Please provide stock quantity'],
      min: [0, 'Stock cannot be negative'],
      default: 0,
    },
    status: {
      type: String,
      enum: ['active', 'draft', 'out_of_stock'],
      default: 'active',
    },
    featured: {
      type: Boolean,
      default: false,
    },
    holiday: {
      type: Boolean,
      default: false,
    },
    pcPart: {
      enabled: { type: Boolean, default: false },
      type: {
        type: String,
        enum: [
          '',
          'cpu',
          'cpu_cooler',
          'motherboard',
          'ram',
          'storage',
          'gpu',
          'psu',
          'casing',
          'monitor',
          'casing_cooler',
          'keyboard',
          'mouse',
          'speaker',
          'headphone',
          'wifi_adapter',
          'antivirus',
          'ups',
        ],
        default: '',
      },
      socket: { type: String, trim: true, default: '' }, // e.g. AM5, AM4, LGA1700
      platform: { type: String, trim: true, default: '' }, // amd | intel
      formFactor: { type: String, trim: true, default: '' }, // ATX, microATX, Mini-ITX
      wattage: { type: Number, default: 0 }, // estimated power draw in watts
      specs: { type: mongoose.Schema.Types.Mixed, default: {} }, // component-specific fields (CPU cores, GPU VRAM, etc.)
    },
    specifications: {
      type: mongoose.Schema.Types.Mixed, // Flexible for any spec (e.g., RAM, CPU, Brand)
      default: {},
    },
    content: {
      type: [mongoose.Schema.Types.Mixed], // Rich content blocks (title, text, image, link)
      default: [],
    },
    seo: {
      metaTitle: { type: String, trim: true },
      metaDescription: { type: String, trim: true },
      focusKeyword: { type: String, trim: true },
      canonical: { type: String, trim: true },
    },
    ratings: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        rating: { type: Number, min: 1, max: 5 },
        comment: { type: String, trim: true },
        status: {
          type: String,
          enum: ['pending', 'approved', 'rejected'],
          default: 'pending',
        },
        featured: {
          type: Boolean,
          default: false,
        },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// ---- Auto-generate slug from name before saving (only if no custom slug set) ----
productSchema.pre('save', function () {
  if (!this.slug) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
});

// ---- Calculate average rating (only approved reviews are included) ----
productSchema.methods.calculateAverageRating = function () {
  const approved = this.ratings.filter((r) => r.status === 'approved');
  if (approved.length === 0) {
    this.averageRating = 0;
  } else {
    const total = approved.reduce((sum, r) => sum + r.rating, 0);
    this.averageRating = (total / approved.length).toFixed(1);
  }
  return this.averageRating;
};

// ---- Indexes for faster queries ----
productSchema.index({ category: 1, price: 1 });
productSchema.index({ name: 'text', description: 'text' }); // Full-text search

const Product = mongoose.model('Product', productSchema);
export default Product;
