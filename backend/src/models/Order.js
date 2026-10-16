// backend/src/models/Order.js

import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  name: {
    type: String,
    required: true, // Snapshot of product name
  },
  price: {
    type: Number,
    required: true, // Snapshot of price (final paid price)
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Quantity must be at least 1'],
  },
  image: {
    type: String,
    required: true, // Snapshot of product image
  },
});

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    items: [orderItemSchema],
    shippingAddress: {
      fullName: { type: String, default: '' },
      phone: { type: String, default: '' },
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      postcode: { type: String, required: true },
      country: { type: String, default: 'Bangladesh' },
    },
    totalAmount: {
      type: Number,
      required: true,
      min: [0, 'Total amount cannot be negative'],
    },
    coupon: {
      code: { type: String, default: '' },
      discount: { type: Number, default: 0, min: [0, 'Discount cannot be negative'] },
    },
    payment: {
      method: {
        type: String,
        default: 'sslcommerz',
      },
      tran_id: { type: String, unique: true, sparse: true }, // SSLCommerz transaction ID
      val_id: { type: String }, // SSLCommerz validation ID
      sessionKey: { type: String }, // SSLCommerz session key
      status: {
        type: String,
        enum: ['pending', 'paid', 'failed', 'cancelled'],
        default: 'pending',
      },
      amount: { type: Number }, // Amount paid (for verification)
      card_type: { type: String }, // Card / Mobile banking type
      paidAt: { type: Date },
    },
    orderStatus: {
      type: String,
      enum: ['pending', 'processing', 'confirmed', 'send_courier', 'cancelled'],
      default: 'pending',
    },
    note: {
      type: String,
      trim: true,
      maxlength: [500, 'Note cannot exceed 500 characters'],
    },
    // Human-friendly sequential order number, e.g. #1, #2 (auto-generated).
    orderNumber: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    // Advance confirmation payment collected to verify genuine COD orders.
    // Operator sets `advanceAmount`; customer pays it online; `advancePaid`
    // is recorded (via gateway IPN) and deducted from the amount due on delivery.
    advanceAmount: {
      type: Number,
      default: 0,
      min: [0, 'Advance amount cannot be negative'],
    },
    advancePaid: {
      type: Number,
      default: 0,
      min: [0, 'Advance paid cannot be negative'],
    },
    advanceReference: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// ---- Indexes for faster queries ----
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ orderStatus: 1 });

// ---- Static method to find by transaction ID ----
orderSchema.statics.findByTranId = function (tran_id) {
  return this.findOne({ 'payment.tran_id': tran_id });
};

const Order = mongoose.model('Order', orderSchema);
export default Order;
