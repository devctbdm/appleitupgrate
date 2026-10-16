import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      enum: ['order', 'delivery', 'rider', 'payment', 'system'],
      default: 'system',
    },
    title: { type: String, required: true },
    description: { type: String, required: true },
    // Optional deep link shown in the admin UI (e.g. /admin/orders?id=...).
    link: { type: String, default: '' },
    read: { type: Boolean, default: false },
    // Optional reference to the related order.
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.model('Notification', notificationSchema);
