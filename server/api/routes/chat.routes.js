import express from 'express';
const router = express.Router();
import chatController from '../controllers/chat.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import {
  validateObjectId,
  validateMessage,
  validateRequest
} from '../middlewares/validation.middleware.js';

// Tüm route'lar için kimlik doğrulama
router.use(authenticate);

// GET /api/chats - Kullanıcının tüm sohbetleri
router.get('/', chatController.getAllChats);

router.patch(
  '/mark-read',
  validateRequest,
  chatController.markAsRead
);

// GET /api/chats/:id
router.get(
  '/:id',
  validateObjectId('id'),
  validateRequest,
  chatController.getChat
);

router.get(
  '/group/:id',
  validateObjectId('id'),
  validateRequest,
  chatController.getGroupChat
);



export default router;