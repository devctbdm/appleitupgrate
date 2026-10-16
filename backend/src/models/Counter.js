import mongoose from 'mongoose';

// Generic counter collection used to generate sequential, human-friendly
// order numbers (e.g. #1, #2, ...). Updated atomically via $inc.
const counterSchema = new mongoose.Schema({
  _id: { type: String },
  seq: { type: Number, default: 0 },
});

export default mongoose.model('Counter', counterSchema);
