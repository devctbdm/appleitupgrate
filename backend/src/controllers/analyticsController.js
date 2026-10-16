// backend/src/controllers/analyticsController.js

import Order from '../models/Order.js';
import Product from '../models/Product.js';
import User from '../models/User.js';

// @desc    Get full analytics for the admin dashboard
// @route   GET /api/analytics
// @access  Private/Admin
export const getAnalytics = async (req, res) => {
  try {
    // ---- Overall stats (exclude cancelled) ----
    const [statsAgg] = await Order.aggregate([
      { $match: { orderStatus: { $ne: 'cancelled' } } },
      {
        $group: {
          _id: null,
          revenue: { $sum: '$totalAmount' },
          orders: { $sum: 1 },
          items: { $sum: { $sum: '$items.quantity' } },
          buyers: { $addToSet: '$user' },
        },
      },
    ]);
    const revenue = statsAgg?.revenue || 0;
    const orders = statsAgg?.orders || 0;
    const productsSold = statsAgg?.items || 0;

    const [products, customers] = await Promise.all([
      Product.countDocuments({ status: 'active' }),
      User.countDocuments({ role: 'customer' }),
    ]);

    const avgOrderValue = orders > 0 ? Math.round(revenue / orders) : 0;
    const avgItemsPerOrder =
      orders > 0 ? Number((productsSold / orders).toFixed(1)) : 0;

    // Repeat customer rate (% of customers with 2+ orders)
    let repeatCustomerRate = 0;
    if (customers > 0) {
      const buyers = statsAgg?.buyers || [];
      if (buyers.length > 0) {
        const [repAgg] = await Order.aggregate([
          {
            $match: {
              user: { $in: buyers },
              orderStatus: { $ne: 'cancelled' },
            },
          },
          { $group: { _id: '$user', count: { $sum: 1 } } },
          { $match: { count: { $gte: 2 } } },
          { $count: 'n' },
        ]);
        repeatCustomerRate = Math.round(
          ((repAgg?.n || 0) / customers) * 100
        );
      }
    }

    // ---- Orders by status ----
    const grouped = await Order.aggregate([
      { $group: { _id: '$orderStatus', count: { $sum: 1 } } },
    ]);
    const ordersByStatus = {
      processing: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
    };
    grouped.forEach((g) => {
      if (ordersByStatus[g._id] !== undefined) ordersByStatus[g._id] = g.count;
    });

    // ---- Monthly series (current year, Jan-Dec) ----
    const currentYear = new Date().getFullYear();
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
          orders: { $sum: 1 },
        },
      },
    ]);
    const monthly = [];
    for (let m = 0; m < 12; m++) {
      const key = `${currentYear}-${String(m + 1).padStart(2, '0')}`;
      const found = monthlyAgg.find((x) => x._id === key);
      const rev = found?.revenue || 0;
      const ord = found?.orders || 0;
      monthly.push({
        month: new Date(`${key}-01T00:00:00Z`).toLocaleString('en-US', {
          month: 'short',
          timeZone: 'UTC',
        }),
        revenue: rev,
        orders: ord,
        avgOrderValue: ord > 0 ? Math.round(rev / ord) : 0,
      });
    }

    // ---- Daily series (last 30 days) ----
    const startOf30 = new Date();
    startOf30.setDate(startOf30.getDate() - 29);
    startOf30.setHours(0, 0, 0, 0);
    const dailyAgg = await Order.aggregate([
      {
        $match: {
          orderStatus: { $ne: 'cancelled' },
          createdAt: { $gte: startOf30 },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          revenue: { $sum: '$totalAmount' },
          orders: { $sum: 1 },
        },
      },
    ]);
    const daily = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
        2,
        '0'
      )}-${String(d.getDate()).padStart(2, '0')}`;
      const found = dailyAgg.find((x) => x._id === key);
      const rev = found?.revenue || 0;
      const ord = found?.orders || 0;
      daily.push({
        month: d.toLocaleDateString('en-US', {
          day: 'numeric',
          month: 'short',
        }),
        revenue: rev,
        orders: ord,
        avgOrderValue: ord > 0 ? Math.round(rev / ord) : 0,
      });
    }

    // ---- Top products by revenue (exclude cancelled) ----
    const topProducts = await Order.aggregate([
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
          _id: '$items.product',
          name: { $first: '$items.name' },
          image: { $first: '$items.image' },
          price: { $first: '$items.price' },
          sku: { $first: '$p.sku' },
          productCode: { $first: '$p.productCode' },
          unitsSold: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 10 },
    ]);

    // ---- Category performance ----
    const catAgg = await Order.aggregate([
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
          units: { $sum: '$items.quantity' },
        },
      },
      { $sort: { revenue: -1 } },
    ]);
    const totalCatRevenue = catAgg.reduce((s, c) => s + c.revenue, 0);
    const categories = catAgg.map((c) => ({
      name: c._id || 'Other',
      revenue: c.revenue,
      orders: c.units,
      percentage:
        totalCatRevenue > 0 ? Math.round((c.revenue / totalCatRevenue) * 100) : 0,
    }));

    res.json({
      success: true,
      data: {
        stats: {
          revenue,
          orders,
          customers,
          products,
          productsSold,
          avgOrderValue,
          avgItemsPerOrder,
          repeatCustomerRate,
          ordersByStatus,
        },
        monthly,
        daily,
        topProducts,
        categories,
      },
    });
  } catch (error) {
    console.error('Analytics Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
