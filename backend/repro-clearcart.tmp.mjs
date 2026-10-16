import mongoose from 'mongoose';
import Cart from './src/models/Cart.js';

const uri = process.env.DB_URI;
await mongoose.connect(uri);

try {
  await Cart.findOneAndUpdate(
    { user: new mongoose.Types.ObjectId('000000000000000000000000') },
    { $set: { items: [], totalItems: 0, totalPrice: 0 } },
    { new: true }
  );
  console.log('findOneAndUpdate OK (no cart matched)');
} catch (e) {
  console.error('ERROR:', e.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}