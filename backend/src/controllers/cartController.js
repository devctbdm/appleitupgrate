import Cart from '../models/Cart.js';

export const getCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id }).populate(
      'items.product',
      'name price images stock'
    );
    if (!cart) {
      return res.json({ success: true, cart: { items: [], totalItems: 0, totalPrice: 0 } });
    }
    res.json({ success: true, cart });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const addToCart = async (req, res) => {
  try {
    const { productId, name, price, quantity, image, promoDiscount } = req.body;

    if (!productId || !quantity) {
      return res
        .status(400)
        .json({ success: false, message: 'Product ID and quantity are required' });
    }

    const cart = await Cart.addItem(req.user._id, { productId, name, price, quantity, image, promoDiscount });
    await cart.populate('items.product', 'name price images stock');

    res.json({ success: true, cart });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateCartItem = async (req, res) => {
  try {
    const { productId, quantity } = req.body;

    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.status(404).json({ success: false, message: 'Cart not found' });
    }

    const item = cart.items.find((i) => i.product.toString() === productId);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found in cart' });
    }

    if (quantity < 1) {
      return res.status(400).json({ success: false, message: 'Quantity must be at least 1' });
    }

    item.quantity = quantity;
    await cart.save();
    await cart.populate('items.product', 'name price images stock');

    res.json({ success: true, cart });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const removeFromCart = async (req, res) => {
  try {
    const { productId } = req.params;

    const cart = await Cart.removeItem(req.user._id, productId);
    if (!cart) {
      return res.status(404).json({ success: false, message: 'Cart not found' });
    }

    await cart.populate('items.product', 'name price images stock');

    res.json({ success: true, cart });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const clearCart = async (req, res) => {
  try {
    // updateOne avoids loading the document, the pre('save') hook and any
    // subdocument validation/casting — robust even if a cart somehow holds a
    // malformed item.
    await Cart.updateOne(
      { user: req.user._id },
      { $set: { items: [], totalItems: 0, totalPrice: 0 } }
    );
    res.json({ success: true, message: 'Cart cleared' });
  } catch (error) {
    console.error('❌ clearCart error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
