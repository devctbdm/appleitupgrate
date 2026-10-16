import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const DB_URI = process.env.DB_URI;

// Connection configuration with enhanced options
const connectionOptions = {
  serverSelectionTimeoutMS: 5000, // Timeout for server selection
  socketTimeoutMS: 45000, // Socket timeout
  maxPoolSize: 10, // Maximum connection pool size
  minPoolSize: 2, // Minimum connection pool size
  retryWrites: true, // Retry write operations
  retryReads: true, // Retry read operations
};

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 2000; // 2 seconds

/**
 * Delay function for retry logic with exponential backoff
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise<void>}
 */
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Connect to MongoDB with retry logic
 * @param {number} retryCount - Current retry attempt
 * @returns {Promise<void>}
 */
export const connectDB = async (retryCount = 0) => {
  try {
    const conn = await mongoose.connect(DB_URI, connectionOptions);

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📦 Database Name: ${conn.connection.name}`);
    console.log(`🔗 Connection Pool Size: ${conn.connection.client.options.maxPoolSize}`);
  } catch (error) {
    console.error(
      `❌ MongoDB connection error (attempt ${retryCount + 1}/${MAX_RETRIES}):`,
      error.message
    );

    const retryDelay = INITIAL_RETRY_DELAY * Math.pow(2, Math.min(retryCount, 6));
    console.log(`⏳ Retrying in ${retryDelay}ms...`);
    await delay(retryDelay);
    return connectDB(retryCount + 1);
  }
};

/**
 * Disconnect from MongoDB (for graceful shutdown)
 * @returns {Promise<void>}
 */
export const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    console.log('🔄 MongoDB disconnected');
  } catch (error) {
    console.error('❌ Error during MongoDB disconnection:', error.message);
  }
};

/**
 * Check database health
 * @returns {Promise<{status: string, host: string, name: string, readyState: number}>}
 */
export const healthCheck = async () => {
  const readyState = mongoose.connection.readyState;
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  return {
    status: states[readyState] || 'unknown',
    host: mongoose.connection.host || 'unknown',
    name: mongoose.connection.name || 'unknown',
    readyState,
  };
};

// Export mongoose instance if needed elsewhere
export { mongoose };

// Enhanced connection event handlers with automatic reconnection
let reconnectAttempts = 0;

mongoose.connection.on('connected', () => {
  console.log('🟢 Mongoose connected to DB');
  reconnectAttempts = 0; // Reset reconnect counter on successful connection
});

mongoose.connection.on('error', (err) => {
  console.error('🔴 Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('🟡 Mongoose disconnected');
  // Attempt automatic reconnection
  if (reconnectAttempts < MAX_RETRIES) {
    reconnectAttempts++;
    const retryDelay = INITIAL_RETRY_DELAY * Math.pow(2, reconnectAttempts - 1);
    console.log(
      `⏳ Attempting automatic reconnection (${reconnectAttempts}/${MAX_RETRIES}) in ${retryDelay}ms...`
    );
    setTimeout(() => {
      connectDB(0).catch((err) => {
        console.error('❌ Automatic reconnection failed:', err.message);
      });
    }, retryDelay);
  } else {
    console.error('❌ Max reconnection attempts reached. Manual intervention required.');
  }
});

mongoose.connection.on('reconnected', () => {
  console.log('🔄 Mongoose reconnected to DB');
  reconnectAttempts = 0;
});

// Handle process termination for graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 SIGINT received. Closing MongoDB connection...');
  await disconnectDB();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 SIGTERM received. Closing MongoDB connection...');
  await disconnectDB();
  process.exit(0);
});
