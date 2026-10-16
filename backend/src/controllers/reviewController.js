// backend/src/controllers/reviewController.js

import Product from '../models/Product.js';

// @desc    Get all reviews across products (paginated, filterable)
// @route   GET /api/reviews
// @access  Private/Admin
export const getAllReviews = async (req, res) => {
  try {
    const {
      search,
      rating,
      status,
      featured,
      page = 1,
      limit = 10,
    } = req.query;

    const pipeline = [
      { $unwind: '$ratings' },
      {
        $lookup: {
          from: 'users',
          localField: 'ratings.user',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          name: 1,
          slug: 1,
          images: 1,
          'ratings._id': 1,
          'ratings.rating': 1,
          'ratings.comment': 1,
          'ratings.status': 1,
          'ratings.featured': 1,
          'ratings.createdAt': 1,
          'user.name': 1,
        },
      },
    ];

    const filters = {};
    if (rating) {
      filters['ratings.rating'] = Number(rating);
    }
    if (status) {
      filters['ratings.status'] = status;
    }
    if (featured === 'true' || featured === true) {
      filters['ratings.featured'] = true;
    }
    if (featured === 'false' || featured === false) {
      filters['ratings.featured'] = false;
    }
    if (search) {
      filters.$or = [
        { 'ratings.comment': { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
        { 'user.name': { $regex: search, $options: 'i' } },
      ];
    }
    if (Object.keys(filters).length > 0) {
      pipeline.push({ $match: filters });
    }

    pipeline.push({
      $facet: {
        metadata: [{ $count: 'total' }],
        data: [
          { $sort: { 'ratings.createdAt': -1 } },
          { $skip: (Number(page) - 1) * Number(limit) },
          { $limit: Number(limit) },
        ],
      },
    });

    const result = await Product.aggregate(pipeline);
    const data = result[0].data || [];
    const total = result[0].metadata[0]?.total || 0;

    const reviews = data.map((d) => ({
      _id: d.ratings._id,
      rating: d.ratings.rating,
      comment: d.ratings.comment || '',
      status: d.ratings.status,
      featured: d.ratings.featured,
      createdAt: d.ratings.createdAt,
      user: d.user ? { _id: d.user._id, name: d.user.name || 'Unknown' } : null,
      product: {
        _id: d._id,
        name: d.name,
        slug: d.slug,
        image: d.images && d.images[0],
      },
    }));

    res.json({
      success: true,
      count: reviews.length,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      reviews,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get review stats (totals, average, distribution)
// @route   GET /api/reviews/stats
// @access  Private/Admin
export const getReviewStats = async (req, res) => {
  try {
    const result = await Product.aggregate([
      { $unwind: '$ratings' },
      {
        $facet: {
          stats: [
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                approved: {
                  $sum: { $cond: [{ $eq: ['$ratings.status', 'approved'] }, 1, 0] },
                },
                pending: {
                  $sum: { $cond: [{ $eq: ['$ratings.status', 'pending'] }, 1, 0] },
                },
                rejected: {
                  $sum: { $cond: [{ $eq: ['$ratings.status', 'rejected'] }, 1, 0] },
                },
                featured: { $sum: { $cond: ['$ratings.featured', 1, 0] } },
                averageRating: {
                  $avg: {
                    $cond: [{ $ne: ['$ratings.status', 'rejected'] }, '$ratings.rating', null],
                  },
                },
              },
            },
          ],
          distribution: [
            { $group: { _id: '$ratings.rating', count: { $sum: 1 } } },
          ],
        },
      },
    ]);

    const stats = result[0].stats[0] || {};
    const distMap = new Map(
      (result[0].distribution || []).map((d) => [d._id, d.count])
    );
    const distribution = [5, 4, 3, 2, 1].map((r) => ({
      rating: r,
      count: distMap.get(r) || 0,
    }));

    res.json({
      success: true,
      stats: {
        total: stats.total || 0,
        approved: stats.approved || 0,
        pending: stats.pending || 0,
        rejected: stats.rejected || 0,
        featured: stats.featured || 0,
        averageRating: Number(stats.averageRating || 0),
        distribution,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update a review (status / featured)
// @route   PATCH /api/reviews/:reviewId
// @access  Private/Admin
export const updateReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { status, featured } = req.body;

    const product = await Product.findOne({ 'ratings._id': reviewId });
    if (!product) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    const review = product.ratings.id(reviewId);
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    if (status) {
      if (!['pending', 'approved', 'rejected'].includes(status)) {
        return res.status(400).json({ success: false, message: 'Invalid status' });
      }
      review.status = status;
    }
    if (featured !== undefined) {
      review.featured = featured === true || featured === 'true';
    }

    product.averageRating = product.calculateAverageRating();
    await product.save();

    res.json({
      success: true,
      review: {
        ...review.toObject(),
        product: {
          _id: product._id,
          name: product.name,
          slug: product.slug,
          image: product.images[0],
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete a review
// @route   DELETE /api/reviews/:reviewId
// @access  Private/Admin
export const deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;

    const product = await Product.findOne({ 'ratings._id': reviewId });
    if (!product) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    product.ratings = product.ratings.filter(
      (r) => r._id.toString() !== reviewId
    );
    product.averageRating = product.calculateAverageRating();
    await product.save();

    res.json({ success: true, message: 'Review deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
