// backend/src/models/Invoice.js

import mongoose from 'mongoose';

const invoiceItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  name: {
    type: String,
    required: true, // Snapshot of product title
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Quantity must be at least 1'],
  },
  unitPrice: {
    type: Number,
    required: true,
  },
  amount: {
    type: Number,
    required: true, // quantity * unitPrice
  },
  warranty: {
    type: String,
    default: '',
  },
  serialNumbers: {
    type: [String],
    default: [],
  },
});

const invoiceSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
    },
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
    },
    customer: {
      name: { type: String, default: '' },
      email: { type: String, default: '' },
      phone: { type: String, default: '' },
      address: { type: String, default: '' },
    },
    issueDate: { type: Date, default: Date.now },
    dueDate: { type: Date, default: Date.now },
    items: [invoiceItemSchema],
    subtotal: { type: Number, default: 0 },
    discount: { type: Number, default: 0, min: 0 },
    deliveryCharge: { type: Number, default: 0, min: 0 },
    extraCharge: { type: Number, default: 0, min: 0 },
    netPayable: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['paid', 'pending', 'overdue', 'cancelled'],
      default: 'pending',
    },
    note: { type: String, default: '' },
    salesPerson: { type: String, default: 'Apple-it-zone' },
    preparedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// ---- Indexes ----
invoiceSchema.index({ order: 1 });
invoiceSchema.index({ status: 1 });

const Invoice = mongoose.model('Invoice', invoiceSchema);
export default Invoice;
