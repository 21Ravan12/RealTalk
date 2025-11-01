import express from 'express';
import { createServer } from 'http';
import { configureServer } from './config/server.config.js';
import { connectDB } from './config/db.config.js';
import { createSocketServer } from './config/socket.config.js';
import { redisClient } from './config/redis.config.js';
import 'dotenv/config';

// Initialize Express app
const app = express();
const httpServer = createServer(app);

// Configure server middleware and routes
configureServer(app);

// Initialize Socket.io
const io = createSocketServer(httpServer);

// Import routes
import apiRoutes from './api/routes/index.js';
app.use('/api', apiRoutes);

// Connect to database and start server
const startServer = async () => {
  try {
    await connectDB();

    if (process.env.REDIS_URL) {
      await redisClient.connect();
      console.log('Redis connected');
    }

    httpServer.listen(process.env.PORT, () => {
      console.log(`Server running in ${process.env.NODE_ENV} mode on port ${process.env.PORT}`);
      console.log(`API docs: http://localhost:${process.env.PORT}/api/docs`);
    });
  } catch (error) {
    console.error('Server startup error:', error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  httpServer.close(() => process.exit(1));
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

startServer();

export { io }; // Socket.io instance for other modules