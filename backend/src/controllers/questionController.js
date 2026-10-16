// backend/src/controllers/questionController.js

import mongoose from 'mongoose';
import Question from '../models/Question.js';
import Product from '../models/Product.js';

// @desc    Get all questions across products (paginated, filterable)
// @route   GET /api/questions
// @access  Private/Admin
export const getAllQuestions = async (req, res) => {
  try {
    const {
      search,
      status,
      featured,
      productId,
      page = 1,
      limit = 10,
    } = req.query;

    const pipeline = [
      {
        $lookup: {
          from: 'products',
          localField: 'product',
          foreignField: '_id',
          as: 'productDoc',
        },
      },
      { $unwind: { path: '$productDoc', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'userDoc',
        },
      },
      { $unwind: { path: '$userDoc', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'users',
          localField: 'answeredBy',
          foreignField: '_id',
          as: 'answeredByDoc',
        },
      },
      { $unwind: { path: '$answeredByDoc', preserveNullAndEmptyArrays: true } },
    ];

    const filters = {};
    if (status) {
      filters.status = status;
    }
    if (featured === 'true' || featured === true) {
      filters.featured = true;
    }
    if (featured === 'false' || featured === false) {
      filters.featured = false;
    }
    if (productId) {
      if (!mongoose.Types.ObjectId.isValid(productId)) {
        return res.status(400).json({ success: false, message: 'Invalid product id' });
      }
      filters.product = new mongoose.Types.ObjectId(productId);
    }
    if (search) {
      filters.$or = [
        { question: { $regex: search, $options: 'i' } },
        { answer: { $regex: search, $options: 'i' } },
        { 'productDoc.name': { $regex: search, $options: 'i' } },
        { 'userDoc.name': { $regex: search, $options: 'i' } },
      ];
    }
    if (Object.keys(filters).length > 0) {
      pipeline.push({ $match: filters });
    }

    pipeline.push({
      $facet: {
        metadata: [{ $count: 'total' }],
        data: [
          { $sort: { createdAt: -1 } },
          { $skip: (Number(page) - 1) * Number(limit) },
          { $limit: Number(limit) },
        ],
      },
    });

    const result = await Question.aggregate(pipeline);
    const data = result[0].data || [];
    const total = result[0].metadata[0]?.total || 0;

    const questions = data.map((d) => ({
      _id: d._id,
      question: d.question,
      answer: d.answer || '',
      status: d.status,
      featured: d.featured,
      createdAt: d.createdAt,
      answeredAt: d.answeredAt || null,
      product: d.productDoc
        ? {
            _id: d.productDoc._id,
            name: d.productDoc.name,
            slug: d.productDoc.slug,
            image: d.productDoc.images && d.productDoc.images[0],
          }
        : null,
      user: d.userDoc ? { _id: d.userDoc._id, name: d.userDoc.name || 'Unknown' } : null,
      answeredBy: d.answeredByDoc
        ? { _id: d.answeredByDoc._id, name: d.answeredByDoc.name || 'Unknown' }
        : null,
    }));

    res.json({
      success: true,
      count: questions.length,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      questions,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get question stats
// @route   GET /api/questions/stats
// @access  Private/Admin
export const getQuestionStats = async (req, res) => {
  try {
    const result = await Question.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          answered: { $sum: { $cond: [{ $eq: ['$status', 'answered'] }, 1, 0] } },
          rejected: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } },
          featured: { $sum: { $cond: ['$featured', 1, 0] } },
        },
      },
    ]);

    const s = result[0] || {};
    res.json({
      success: true,
      stats: {
        total: s.total || 0,
        pending: s.pending || 0,
        answered: s.answered || 0,
        rejected: s.rejected || 0,
        featured: s.featured || 0,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get answered questions for a product (storefront)
// @route   GET /api/questions/product/:productId
// @access  Public
export const getProductQuestions = async (req, res) => {
  try {
    const { productId } = req.params;
    const questions = await Question.find({
      product: productId,
      status: 'answered',
    })
      .populate('user', 'name')
      .sort({ featured: -1, createdAt: -1 });

    res.json({ success: true, count: questions.length, questions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Ask a question about a product
// @route   POST /api/questions
// @access  Private
export const askQuestion = async (req, res) => {
  try {
    const { productId, question } = req.body;

    if (!productId || !question || !question.trim()) {
      return res
        .status(400)
        .json({ success: false, message: 'Product and question are required' });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const newQuestion = await Question.create({
      product: productId,
      user: req.user._id,
      question: question.trim(),
    });

    res.status(201).json({ success: true, question: newQuestion });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update a question (answer / status / featured)
// @route   PATCH /api/questions/:questionId
// @access  Private/Admin
export const updateQuestion = async (req, res) => {
  try {
    const { questionId } = req.params;
    const { answer, status, featured } = req.body;

    const question = await Question.findById(questionId);
    if (!question) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }

    if (answer !== undefined) {
      question.answer = answer;
      if (answer && answer.trim()) {
        question.answeredBy = req.user._id;
        question.answeredAt = Date.now();
        if (question.status === 'pending') {
          question.status = 'answered';
        }
      }
    }

    if (status) {
      if (!['pending', 'answered', 'rejected'].includes(status)) {
        return res.status(400).json({ success: false, message: 'Invalid status' });
      }
      question.status = status;
      if (status === 'answered') {
        if (!question.answeredAt) {
          question.answeredAt = Date.now();
        }
        question.answeredBy = question.answeredBy || req.user._id;
      } else {
        question.answeredAt = null;
        question.answeredBy = null;
      }
    }

    if (featured !== undefined) {
      question.featured = featured === true || featured === 'true';
    }

    await question.save();
    res.json({ success: true, question });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete a question
// @route   DELETE /api/questions/:questionId
// @access  Private/Admin
export const deleteQuestion = async (req, res) => {
  try {
    const { questionId } = req.params;
    const question = await Question.findByIdAndDelete(questionId);
    if (!question) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }
    res.json({ success: true, message: 'Question deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
