// backend/src/controllers/dashboardController.js

import Order from '../models/Order.js';
import Product from '../models/Product.js';
import User from '../models/User.js';

// @desc    Get admin dashboard statistics
// @route   GET /api/dashboard
// @access  Private/Admin
export const getDashboardStats = async (req, res) => {
  try {
    // ---- Revenue + products sold (exclude cancelled orders) ----
    const [revAgg] = await Order.aggregate([
      { $match: { orderStatus: { $ne: 'cancelled' } } },
      {
        $group: {
          _id: null,
          revenue: { $sum: '$totalAmount' },
          itemsSold: { $sum: { $sum: '$items.quantity' } },
        },
      },
    ]);
    const revenue = revAgg?.revenue || 0;
    const productsSold = revAgg?.itemsSold || 0;

    // ---- Counts ----
    const [orders, customers, products] = await Promise.all([
      Order.countDocuments(),
      User.countDocuments({ role: 'customer' }),
      Product.countDocuments({ status: 'active' }),
    ]);

    // ---- Orders by status ----
    const grouped = await Order.aggregate([
      { $group: { _id: '$orderStatus', count: { $sum: 1 } } },
    ]);
    const ordersByStatus = {
      pending: 0,
      processing: 0,
      cancelled: 0,
    };
    grouped.forEach((g) => {
      if (ordersByStatus[g._id] !== undefined) ordersByStatus[g._id] = g.count;
    });

    // ---- Recent orders ----
    const recentOrders = await Order.find()
      .populate('user', 'name email phone')
      .sort({ createdAt: -1 })
      .limit(5);

    // ---- Top products by quantity sold (exclude cancelled) ----
    const topProducts = await Order.aggregate([
      { $match: { orderStatus: { $ne: 'cancelled' } } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          name: { $first: '$items.name' },
          image: { $first: '$items.image' },
          sales: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
        },
      },
      { $sort: { sales: -1 } },
      { $limit: 5 },
    ]);

    // ---- Sales by category (revenue share) ----
    const categoryAgg = await Order.aggregate([
      { $match: { orderStatus: { $ne: 'cancelled' } } },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products',
          localField: 'items.product',
          foreignField: '_id',
          as: 'p',
        },
      },
      { $unwind: { path: '$p', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$p.category',
          revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
        },
      },
      { $sort: { revenue: -1 } },
    ]);
    const totalCatRevenue = categoryAgg.reduce((s, c) => s + c.revenue, 0);
    const salesByCategory = categoryAgg.slice(0, 5).map((c) => ({
      name: c._id || 'Other',
      value:
        totalCatRevenue > 0
          ? Math.round((c.revenue / totalCatRevenue) * 100)
          : 0,
    }));

    // ---- Monthly revenue (current year, Jan-Dec) ----
    const currentYear = new Date().getFullYear();
    const monthKeys = [];
    for (let m = 0; m < 12; m++) {
      monthKeys.push(`${currentYear}-${String(m + 1).padStart(2, '0')}`);
    }
    const startOfYear = new Date(currentYear, 0, 1);

    const monthlyAgg = await Order.aggregate([
      {
        $match: {
          orderStatus: { $ne: 'cancelled' },
          createdAt: { $gte: startOfYear },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          revenue: { $sum: '$totalAmount' },
        },
      },
    ]);
    const monthlyRevenue = monthKeys.map((key) => {
      const found = monthlyAgg.find((m) => m._id === key);
      return {
        label: new Date(`${key}-01T00:00:00Z`).toLocaleString('en-US', {
          month: 'short',
          timeZone: 'UTC',
        }),
        value: found?.revenue || 0,
      };
    });

    res.json({
      success: true,
      stats: {
        revenue,
        orders,
        customers,
        productsSold,
        products,
        ordersByStatus,
        recentOrders,
        topProducts,
        salesByCategory,
        monthlyRevenue,
      },
    });
  } catch (error) {
    console.error('Dashboard Stats Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
