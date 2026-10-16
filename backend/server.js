import app from './src/app.js';
import { connectDB, disconnectDB } from './src/config/database.js';
import { connectRedis } from './src/config/redis.js';
import { initSocket } from './src/socket.js';
import dotenv from 'dotenv';

// Import models to register schemas
import './src/models/User.js';
import './src/models/Product.js';
import './src/models/Cart.js';
import Order from './src/models/Order.js';
import { backfillOrderNumbers } from './src/utils/orderNumber.js';

dotenv.config();

const PORT = process.env.PORT || 5000;

// Connect to MongoDB
await connectDB();

// Connect to Redis (non-fatal if unavailable)
await connectRedis();

// Assign sequential order numbers (#1, #2, ...) to any existing orders
backfillOrderNumbers()
  .then((n) => {
    if (n) console.log(`🆔 Backfilled ${n} order number(s)`);
  })
  .catch((e) => console.error('Order number backfill failed:', e.message));

// Migrate legacy order statuses that were removed from the enum.
Order.updateMany(
  { orderStatus: { $in: ['shipped', 'delivered'] } },
  { $set: { orderStatus: 'processing' } }
)
  .then((res) => {
    if (res.modifiedCount) {
      console.log(`🔄 Migrated ${res.modifiedCount} legacy order(s) to processing`);
    }
  })
  .catch((e) => console.error('Order status migration failed:', e.message));

// Migrate legacy "AIZ-N" order numbers to the "#N" format.
Order.find({ orderNumber: { $regex: /^AIZ-/i } })
  .then(async (legacy) => {
    for (const o of legacy) {
      const m = /^AIZ-(\d+)$/i.exec(o.orderNumber || '');
      if (m) {
        o.orderNumber = `#${m[1]}`;
        await o.save();
      }
    }
    if (legacy.length) {
      console.log(`🔄 Migrated ${legacy.length} legacy order number(s) to # format`);
    }
  })
  .catch((e) => console.error('Order number migration failed:', e.message));

// Start server after successful connection
const server = app.listen(PORT,"0.0.0.0", () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

// Attach Socket.io for real-time admin notifications
initSocket(server);

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Received SIGINT. Shutting down gracefully...');
  await disconnectDB();
  server.close(() => {
    console.log('👋 Server closed');
    process.exit(0);
  });
});

process.on('SIGTERM', async () => {
  console.log('🛑 Received SIGTERM. Shutting down gracefully...');
  await disconnectDB();
  server.close(() => {
    console.log('👋 Server closed');
    process.exit(0);
  });
});
