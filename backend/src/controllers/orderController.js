import mongoose from "mongoose";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import PromoCode from "../models/PromoCode.js";
import User from "../models/User.js";
import { expandPromoCategories } from "../utils/categoryTree.js";
import { getNextOrderNumber } from "../utils/orderNumber.js";
import { notifyOrderStatusChange } from "../services/smsService.js";
import { notifyOrderConfirmation, notifyOrderStatusEmail } from "../services/emailService.js";
import { createNotification } from "../services/notificationService.js";

// @desc    Create a new order
// @route   POST /api/orders
// @access  Private
export const createOrder = async (req, res) => {
  try {
    const { items, shippingAddress, paymentMethod, note, couponCode } =
      req.body;

    if (!items || items.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "No items in order" });
    }

    // Validate stock and calculate total
    let totalAmount = 0;
    const orderItems = [];
    const promoItems = [];

    for (const item of items) {
      const product = await Product.findById(item.product).populate("category");
      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Product ${item.product} not found`,
        });
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.name}`,
        });
      }

      // Reduce stock
      product.stock -= item.quantity;
      await product.save();

      const price =
        product.discountPrice > 0 ? product.discountPrice : product.price;
      totalAmount += price * item.quantity;

      orderItems.push({
        product: product._id,
        name: product.name,
        quantity: item.quantity,
        price: price,
        image: product.images[0] || "",
      });

      promoItems.push({
        categories:
          Array.isArray(product.categories) && product.categories.length
            ? product.categories
            : product.category &&
                typeof product.category === "object" &&
                product.category.name
              ? [product.category.name]
              : [],
        price,
        quantity: item.quantity,
      });
    }

    // Re-validate coupon server-side (category-aware) and apply discount
    let couponDiscount = 0;
    let appliedPromo = null;
    if (couponCode) {
      const promo = await PromoCode.findOne({ code: couponCode.toUpperCase() });
      if (promo) {
        const result = promo.computeItemDiscount(
          promoItems,
          totalAmount,
          await expandPromoCategories(promo.categories || []),
        );
        if (result.valid) {
          couponDiscount = result.discount;
          appliedPromo = promo;
        }
      }
    }
    totalAmount = Math.max(0, totalAmount - couponDiscount);

    // Create order
    const orderNumber = await getNextOrderNumber();
    const order = new Order({
      user: req.user._id,
      items: orderItems,
      shippingAddress,
      totalAmount,
      coupon: appliedPromo
        ? { code: appliedPromo.code, discount: couponDiscount }
        : undefined,
      payment: {
        method: paymentMethod || "sslcommerz",
        status: "pending",
      },
      orderStatus: "pending",
      note: note || "",
      orderNumber,
    });

    await order.save();

    if (appliedPromo) {
      appliedPromo.usageCount += 1;
      await appliedPromo.save();
    }

    // Fire-and-forget SMS confirmation (never blocks the order response)
    if (req.user?.phone) {
      notifyOrderStatusChange({
        order,
        status: "pending",
        name: req.user.name || "Customer",
        phone: req.user.phone,
      }).catch(() => {});
    }

    // Fire-and-forget email confirmation (never blocks the order response)
    if (req.user?.email) {
      notifyOrderConfirmation({
        order,
        name: req.user.name || "Customer",
        email: req.user.email,
      }).catch(() => {});
    }

    // Real-time admin notification for the new order
    await createNotification({
      category: "order",
      title: "New order received",
      description: `Order ${order.orderNumber} placed by ${req.user.name || "a customer"} for ৳${totalAmount}.`,
      link: `/admin/orders?id=${order._id}`,
      order: order._id,
    });

    res.status(201).json({
      success: true,
      order,
    });
  } catch (error) {
    console.error("Create Order Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all orders of logged-in user
// @route   GET /api/orders/my-orders
// @access  Private
export const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .populate("items.product", "name images")
      .sort({ createdAt: -1 });
    res.json({ success: true, orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single order by ID (user or admin)
// @route   GET /api/orders/:id
// @access  Private
export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("user", "name email phone")
      .populate("items.product", "name images");

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    // Check if user is authorized (owner or admin)
    if (
      order.user._id.toString() !== req.user._id.toString() &&
      req.user.role !== "admin" &&
      req.user.role !== "super_admin"
    ) {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized" });
    }

    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all orders (Admin only)
// @route   GET /api/orders
// @access  Private/Admin
export const getAllOrders = async (req, res) => {
  try {
    const { status, search } = req.query;
    const pageNum = Math.max(1, Number(req.query.page) || 1);
    const limitNum = Math.min(100, Math.max(1, Number(req.query.limit) || 10));
    const s = String(search || "").trim();

    const match = {};
    if (status) {
      match.orderStatus = status;
    }

    let orders;
    let total;

    if (s) {
      // Search across order fields AND customer name/email (via $lookup)
      const or = [
        { "shippingAddress.city": { $regex: s, $options: "i" } },
        { "shippingAddress.street": { $regex: s, $options: "i" } },
        { "payment.tran_id": { $regex: s, $options: "i" } },
        { "items.name": { $regex: s, $options: "i" } },
        { "userDoc.name": { $regex: s, $options: "i" } },
        { "userDoc.email": { $regex: s, $options: "i" } },
        { "userDoc.phone": { $regex: s, $options: "i" } },
      ];
      if (/^[0-9a-fA-F]{24}$/.test(s)) {
        or.push({ _id: new mongoose.Types.ObjectId(s) });
      }

      const [agg] = await Order.aggregate([
        {
          $lookup: {
            from: "users",
            localField: "user",
            foreignField: "_id",
            as: "userDoc",
          },
        },
        { $match: { ...match, $or: or } },
        { $sort: { createdAt: -1 } },
        {
          $facet: {
            meta: [{ $count: "total" }],
            data: [{ $skip: (pageNum - 1) * limitNum }, { $limit: limitNum }],
          },
        },
      ]);

      total = agg?.meta?.[0]?.total ?? 0;
      orders = (agg?.data || []).map((o) => ({
        ...o,
        user: o.userDoc?.[0] || o.user,
      }));
    } else {
      orders = await Order.find(match)
        .populate("user", "name email phone")
        .populate("items.product", "name")
        .sort({ createdAt: -1 })
        .limit(limitNum)
        .skip((pageNum - 1) * limitNum);
      total = await Order.countDocuments(match);
    }

    res.json({
      success: true,
      total,
      page: pageNum,
      pages: Math.max(1, Math.ceil(total / limitNum)),
      orders,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get order statistics (Admin only)
// @route   GET /api/orders/stats
// @access  Private/Admin
export const getOrderStats = async (req, res) => {
  try {
    const grouped = await Order.aggregate([
      { $group: { _id: "$orderStatus", count: { $sum: 1 } } },
    ]);
    const stats = {
      total: 0,
      pending: 0,
      processing: 0,
      confirmed: 0,
      send_courier: 0,
      cancelled: 0,
    };
    grouped.forEach((g) => {
      if (stats[g._id] !== undefined) stats[g._id] = g.count;
    });
    stats.total =
      stats.pending +
      stats.processing +
      stats.confirmed +
      stats.send_courier +
      stats.cancelled;
    res.json({ success: true, stats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update order status (Admin only)
// @route   PUT /api/orders/:id/status
// @access  Private/Admin
export const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ["pending", "processing", "confirmed", "send_courier", "cancelled"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    // If cancelling, restore stock
    if (status === "cancelled" && order.orderStatus !== "cancelled") {
      for (const item of order.items) {
        const product = await Product.findById(item.product);
        if (product) {
          product.stock += item.quantity;
          await product.save();
        }
      }
    }

    const prevStatus = order.orderStatus;
    order.orderStatus = status;
    await order.save();

    // Fire-and-forget SMS + email on every status change (pending →
    // processing → confirmed → send_courier → cancelled).
    if (status !== prevStatus) {
      const populated = await order.populate("user", "name phone email");
      const phone = populated.user?.phone;
      const email = populated.user?.email;
      if (phone) {
        notifyOrderStatusChange({
          order,
          status,
          name: populated.user?.name || "Customer",
          phone,
        }).catch(() => {});
      }
      if (email) {
        notifyOrderStatusEmail({
          order,
          status,
          name: populated.user?.name || "Customer",
          email,
        }).catch(() => {});
      }
    }

    // Real-time admin notification for the status change
    const label =
      status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, " ");
    await createNotification({
      category: "order",
      title: `Order ${label}`,
      description: `Order ${order.orderNumber} status is now ${label}.`,
      link: `/admin/orders?id=${order._id}`,
      order: order._id,
    });

    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update payment status (invoice status) of an order
// @route   PUT /api/orders/:id/payment-status
// @access  Private/Admin
export const updatePaymentStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ["Pending", "Paid", "Failed", "Cancelled"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    const prevPaymentStatus = order.payment.status;
    order.payment.status = status;
    if (status === "Paid") {
      order.payment.paidAt = order.payment.paidAt || new Date();
    } else {
      order.payment.paidAt = undefined;
    }
    await order.save();

    if (prevPaymentStatus !== "Paid" && status === "Paid") {
      await createNotification({
        category: "payment",
        title: "Payment confirmed",
        description: `Payment of ৳${order.totalAmount} for order ${order.orderNumber} is confirmed.`,
        link: `/admin/orders?id=${order._id}`,
        order: order._id,
      });
    }

    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Set/update the advance confirmation amount for a COD order, and/or
//          manually record an advance payment received (operator verification).
// @route   PUT /api/orders/:id/advance
// @access  Private/Admin
export const updateAdvance = async (req, res) => {
  try {
    const { advanceAmount, advancePaid, advanceReference } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    const wasPaid = order.payment.status === "paid";

    if (advanceAmount !== undefined) {
      const amt = Number(advanceAmount);
      if (isNaN(amt) || amt < 0) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid advance amount" });
      }
      order.advanceAmount = amt;
    }
    if (advancePaid !== undefined) {
      const paid = Number(advancePaid);
      if (isNaN(paid) || paid < 0) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid advance paid amount" });
      }
      order.advancePaid = paid;
    }
    if (advanceReference !== undefined) {
      order.advanceReference = String(advanceReference || "").trim();
    }

    // Keep advancePaid within sensible bounds.
    if (order.advancePaid > order.advanceAmount && order.advanceAmount > 0) {
      order.advancePaid = order.advanceAmount;
    }

    // If the confirmed advance fully covers the order, it is paid in full.
    if (
      Number(order.advancePaid) >= Number(order.totalAmount) &&
      order.advancePaid > 0
    ) {
      order.payment.status = "paid";
      order.payment.amount = Number(order.advancePaid) || order.payment.amount;
      order.payment.paidAt = order.payment.paidAt || new Date();
    } else if (order.payment.status === "paid") {
      // Advance no longer covers the order — revert to pending.
      order.payment.status = "pending";
    }

    await order.save();

    if (!wasPaid && order.payment.status === "paid") {
      await createNotification({
        category: "payment",
        title: "Advance payment received",
        description: `Order ${order.orderNumber} is now fully paid (advance ৳${order.advancePaid}).`,
        link: `/admin/orders?id=${order._id}`,
        order: order._id,
      });
    }

    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create an order on behalf of a customer (Admin/Manager only)
//          Never trusts client-submitted prices or totals — all prices are
//          re-fetched from the database before writing the order.
// @route   POST /api/orders/admin-create
// @access  Private/Admin
export const adminCreateOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const {
      customerId,
      items,
      shippingAddress,
      paymentMethod,
      paymentStatus,
      orderStatus,
      note,
      couponCode,
      shippingFee = 0,
    } = req.body;

    // ── 1. Validate customer ────────────────────────────────────────────────
    if (!customerId) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: "Customer is required" });
    }
    const customer = await User.findById(customerId).session(session);
    if (!customer || customer.role !== "customer") {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ success: false, message: "Customer not found" });
    }

    // ── 2. Validate items ───────────────────────────────────────────────────
    if (!items || !Array.isArray(items) || items.length === 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: "No items in order" });
    }

    // ── 3. Validate shipping address ────────────────────────────────────────
    const addr = shippingAddress || {};
    if (!addr.street || !addr.city || !addr.state || !addr.postcode) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: "Shipping address (street, city, state, postcode) is required" });
    }

    // ── 4. Fetch products, validate stock, build order items ────────────────
    let subtotal = 0;
    const orderItems = [];
    const promoItems = [];

    for (const item of items) {
      if (!item.product || !item.quantity || item.quantity < 1) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ success: false, message: "Each item must have a product ID and quantity ≥ 1" });
      }

      const product = await Product.findById(item.product)
        .populate("category")
        .session(session);

      if (!product) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({ success: false, message: `Product not found: ${item.product}` });
      }
      if (product.status !== "active") {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ success: false, message: `Product "${product.name}" is not available` });
      }
      if (product.stock < item.quantity) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for "${product.name}" — available: ${product.stock}, requested: ${item.quantity}`,
        });
      }

      // Server-authoritative price (ignore any client-submitted price)
      const price = product.discountPrice > 0 ? product.discountPrice : product.price;
      subtotal += price * item.quantity;

      // Deduct stock inside the transaction
      product.stock -= item.quantity;
      await product.save({ session });

      orderItems.push({
        product: product._id,
        name: product.name,
        quantity: item.quantity,
        price,
        image: product.images[0] || "",
      });

      promoItems.push({
        categories:
          Array.isArray(product.categories) && product.categories.length
            ? product.categories
            : product.category &&
                typeof product.category === "object" &&
                product.category.name
              ? [product.category.name]
              : [],
        price,
        quantity: item.quantity,
      });
    }

    // ── 5. Apply coupon (category-aware, server-validated) ──────────────────
    let couponDiscount = 0;
    let appliedPromo = null;
    if (couponCode && couponCode.trim()) {
      const promo = await PromoCode.findOne({ code: couponCode.trim().toUpperCase() }).session(session);
      if (promo) {
        const expanded = await expandPromoCategories(promo.categories || []);
        const result = promo.computeItemDiscount(promoItems, subtotal, expanded);
        if (result.valid) {
          couponDiscount = result.discount;
          appliedPromo = promo;
        }
      }
    }

    // ── 6. Calculate total ──────────────────────────────────────────────────
    const shipping = Math.max(0, Number(shippingFee) || 0);
    const totalAmount = Math.max(0, subtotal - couponDiscount + shipping);

    // ── 7. Validate payment method ──────────────────────────────────────────
    const validPaymentMethods = ["cod", "bkash", "nagad", "sslcommerz", "bank_transfer", "cash"];
    const method = paymentMethod || "cod";
    if (!validPaymentMethods.includes(method)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: `Invalid payment method: ${method}` });
    }

    // ── 8. Validate order status ────────────────────────────────────────────
    const validOrderStatuses = ["pending", "processing", "confirmed", "send_courier", "cancelled"];
    const initStatus = orderStatus || "pending";
    if (!validOrderStatuses.includes(initStatus)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: `Invalid order status: ${initStatus}` });
    }

    // ── 9. Validate payment status ──────────────────────────────────────────
    const validPaymentStatuses = ["pending", "paid", "failed", "cancelled"];
    const initPaymentStatus = (paymentStatus || "pending").toLowerCase();
    if (!validPaymentStatuses.includes(initPaymentStatus)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: `Invalid payment status: ${initPaymentStatus}` });
    }

    // ── 10. Create the order ────────────────────────────────────────────────
    const orderNumber = await getNextOrderNumber();
    const order = new Order({
      user: customer._id,
      items: orderItems,
      shippingAddress: {
        fullName: addr.fullName || customer.name || "",
        phone: addr.phone || customer.phone || "",
        street: addr.street,
        city: addr.city,
        state: addr.state,
        postcode: addr.postcode,
        country: addr.country || "Bangladesh",
      },
      totalAmount,
      coupon: appliedPromo
        ? { code: appliedPromo.code, discount: couponDiscount }
        : undefined,
      payment: {
        method,
        status: initPaymentStatus,
        paidAt: initPaymentStatus === "paid" ? new Date() : undefined,
      },
      orderStatus: initStatus,
      note: (note || "").trim().slice(0, 500),
      orderNumber,
    });

    await order.save({ session });

    // ── 11. Increment promo usage ────────────────────────────────────────────
    if (appliedPromo) {
      appliedPromo.usageCount += 1;
      await appliedPromo.save({ session });
    }

    await session.commitTransaction();
    session.endSession();

    // ── 12. Side-effects (fire-and-forget, outside transaction) ─────────────
    if (customer.phone) {
      notifyOrderStatusChange({
        order,
        status: initStatus,
        name: customer.name || "Customer",
        phone: customer.phone,
      }).catch(() => {});
    }
    if (customer.email) {
      notifyOrderConfirmation({
        order,
        name: customer.name || "Customer",
        email: customer.email,
      }).catch(() => {});
    }

    await createNotification({
      category: "order",
      title: "New order created by staff",
      description: `Order ${order.orderNumber} created for ${customer.name} by ${req.user.name || "admin"} for ৳${totalAmount}.`,
      link: `/admin/orders/${order._id}`,
      order: order._id,
    });

    // Populate user for the response
    await order.populate("user", "name email phone");

    res.status(201).json({
      success: true,
      order,
      summary: {
        subtotal,
        shippingFee: shipping,
        couponDiscount,
        totalAmount,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Admin Create Order Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
