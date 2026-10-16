// backend/src/models/Cart.js

import mongoose from 'mongoose';

const cartItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  name: {
    type: String,
    required: true, // Snapshot product name at the time of adding to cart
  },
  price: {
    type: Number,
    required: true, // Snapshot price at the time of adding to cart
  },
  promoDiscount: {
    type: Number,
    default: 0, // Per-unit discount from the product's sale price
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Quantity cannot be less than 1'],
    default: 1,
  },
  image: {
    type: String,
    required: true, // Snapshot product image
  },
});

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true, // One cart per user
    },
    items: [cartItemSchema],
    totalItems: {
      type: Number,
      default: 0,
    },
    totalPrice: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

// ---- Recalculate totals before saving ----
cartSchema.pre('save', function () {
  if (this.isModified('items')) {
    this.totalItems = this.items.reduce((sum, item) => sum + item.quantity, 0);
    this.totalPrice = this.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }
});

// ---- Static method to add or update item ----
cartSchema.statics.addItem = async function (userId, productData) {
  const { productId, name, price, quantity, image, promoDiscount } = productData;

  let cart = await this.findOne({ user: userId });

  if (!cart) {
    // Create new cart if doesn't exist
    cart = new this({
      user: userId,
      items: [{ product: productId, name, price, quantity, image, promoDiscount }],
    });
  } else {
    // Check if product already exists in cart
    const existingItemIndex = cart.items.findIndex((item) => item.product.toString() === productId);

    if (existingItemIndex > -1) {
      // Update quantity if already exists
      cart.items[existingItemIndex].quantity += quantity;
      cart.items[existingItemIndex].promoDiscount = promoDiscount || 0;
    } else {
      // Add new item
      cart.items.push({ product: productId, name, price, quantity, image, promoDiscount });
    }
  }

  // Recalculate totals (will trigger pre-save hook)
  await cart.save();
  return cart;
};

// ---- Static method to remove item ----
cartSchema.statics.removeItem = async function (userId, productId) {
  const cart = await this.findOne({ user: userId });
  if (!cart) {
    return null;
  }

  cart.items = cart.items.filter((item) => item.product.toString() !== productId);
  await cart.save();
  return cart;
};

const Cart = mongoose.model('Cart', cartSchema);
export default Cart;
