import express from 'express';
const router = express.Router();
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import friendRoutes from './friend.routes.js';
import chatRoutes from './chat.routes.js';
import groupRoutes from './group.routes.js';

// API versiyonlama ve route birleştirme
router.use('/v1/auth', authRoutes);
router.use('/v1/users', userRoutes);
router.use('/v1/friends', friendRoutes);
router.use('/v1/chats', chatRoutes);
router.use('/v1/groups', groupRoutes);

// API documentation route
router.get('/docs', (req, res) => {
  res.json({
    message: 'API Documentation',
    endpoints: {
      auth: '/api/v1/auth',
      users: '/api/v1/users',
      friends: '/api/v1/friends',
      chats: '/api/v1/chats',
      groups: '/api/v1/groups'
    }
  });
});

// 404 Handler for API routes
router.use((req, res, next) => {
  console.log('404 handler reached for:', req.originalUrl);
  res.status(404).json({
    success: false,
    message: 'API endpoint not found'
  });
});

export default router;