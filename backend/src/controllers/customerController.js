import mongoose from 'mongoose';
import User from '../models/User.js';
import Order from '../models/Order.js';

export const getCustomers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, status } = req.query;

    const pipeline = [
      {
        $match: { role: 'customer' }
      },
      {
        $lookup: {
          from: 'orders',
          localField: '_id',
          foreignField: 'user',
          as: 'orders'
        }
      },
      {
        $addFields: {
          orderCount: { $size: '$orders' },
          totalSpent: { $ifNull: [{ $sum: '$orders.totalAmount' }, 0] }
        }
      }
    ];

    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { phone: { $regex: search, $options: 'i' } }
          ]
        }
      });
    }

    if (status && status !== 'all') {
      pipeline.push({ $match: { status } });
    }

    const countPipeline = [...pipeline, { $count: 'total' }];
    const totalResult = await User.aggregate(countPipeline);
    const total = totalResult[0]?.total || 0;

    pipeline.push(
      { $sort: { createdAt: -1 } },
      { $skip: (Number(page) - 1) * Number(limit) },
      { $limit: Number(limit) }
    );

    pipeline.push({
      $project: {
        _id: 1,
        name: 1,
        email: 1,
        phone: 1,
        address: 1,
        status: 1,
        createdAt: 1,
        orderCount: 1,
        totalSpent: 1
      }
    });

    const customers = await User.aggregate(pipeline);

    res.json({
      success: true,
      count: customers.length,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      customers
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getCustomerById = async (req, res) => {
  try {
    const [customer] = await User.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(req.params.id), role: 'customer' } },
      {
        $lookup: {
          from: 'orders',
          localField: '_id',
          foreignField: 'user',
          as: 'orders'
        }
      },
      {
        $addFields: {
          orderCount: { $size: '$orders' },
          totalSpent: { $ifNull: [{ $sum: '$orders.totalAmount' }, 0] }
        }
      },
      {
        $project: {
          _id: 1,
          name: 1,
          email: 1,
          phone: 1,
          address: 1,
          status: 1,
          createdAt: 1,
          orderCount: 1,
          totalSpent: 1
        }
      }
    ]);

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    res.json({ success: true, customer });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete a customer (Super admin only)
// @route   DELETE /api/customers/:id
export const deleteCustomer = async (req, res) => {
  try {
    const customer = await User.findOne({ _id: req.params.id, role: 'customer' });
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    if (req.user._id.toString() === customer._id.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own account' });
    }

    await customer.deleteOne();

    res.json({
      success: true,
      message: `Customer "${customer.name}" deleted successfully`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
