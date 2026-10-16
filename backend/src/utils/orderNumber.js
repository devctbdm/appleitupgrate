import Counter from '../models/Counter.js';
import Order from '../models/Order.js';

const ORDER_PREFIX = '#';

// Atomically fetch the next sequential order number (#1, #2, ...).
export const getNextOrderNumber = async () => {
  const counter = await Counter.findByIdAndUpdate(
    'order',
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return `${ORDER_PREFIX}${counter.seq}`;
};

// One-time backfill: assign sequential numbers to any existing orders that
// don't have one yet (in creation order). Safe to call on every boot.
export const backfillOrderNumbers = async () => {
  const missing = await Order.find({
    orderNumber: { $in: [null, ''] },
  }).sort({ createdAt: 1 });

  for (const order of missing) {
    order.orderNumber = await getNextOrderNumber();
    await order.save();
  }
  return missing.length;
};
