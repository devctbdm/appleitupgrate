import express from 'express';
import {
  getAllQuestions,
  getQuestionStats,
  getProductQuestions,
  askQuestion,
  updateQuestion,
  deleteQuestion,
} from '../controllers/questionController.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

// Public / customer routes
router.get('/product/:productId', getProductQuestions);
router.post('/', protect, askQuestion);

// Admin only
router.use(protect, adminOnly);
router.get('/', getAllQuestions);
router.get('/stats', getQuestionStats);
router.patch('/:questionId', updateQuestion);
router.delete('/:questionId', deleteQuestion);

export default router;
