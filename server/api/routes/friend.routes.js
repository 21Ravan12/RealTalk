import express from 'express';
const router = express.Router();
import friendController from '../controllers/friend.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import {
  validateObjectId,
  validateRequest
} from '../middlewares/validation.middleware.js';

// Tüm route'lar için kimlik doğrulama
router.use(authenticate);

// GET /api/friends - Kullanıcının arkadaş listesi
router.get('/', friendController.getFriends);

// GET /api/friends/requests - Gelen arkadaşlık istekleri
router.get('/requests', friendController.getFriendRequests);

// POST /api/friends/:id - Arkadaşlık isteği gönder
router.post(
  '/sendFriendRequest',
  validateRequest,
  friendController.sendFriendRequest
);

// PATCH /api/friends/:id/accept - Arkadaşlık isteğini kabul et
router.patch(
  '/:id/accept',
  validateObjectId('id'),
  validateRequest,
  friendController.acceptFriendRequest
);

// DELETE /api/friends/:id - Arkadaşlık isteğini reddet veya arkadaşlığı sil
router.delete(
  '/:id',
  validateObjectId('id'),
  validateRequest,
  friendController.removeFriend
);

export default router;