import express from 'express';
const router = express.Router();
import groupController from '../controllers/group.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import {
  validateObjectId,
  validateRequest
} from '../middlewares/validation.middleware.js';

// Tüm route'lar için kimlik doğrulama
router.use(authenticate);

// GET /api/groups - Kullanıcının grupları
router.get('/', groupController.getUserGroups);

// POST /api/groups - Yeni grup oluştur
router.post('/', groupController.createGroup);

// GET /api/groups/:id - Grup detayları
router.get(
  '/:id',
  validateObjectId('id'),
  validateRequest,
  groupController.getGroup
);

// PATCH /api/groups/:id - Grup bilgilerini güncelle
router.patch(
  '/:id',
  validateObjectId('id'),
  validateRequest,
  groupController.updateGroup
);

// POST /groups/:id/members - Gruba üye ekle
router.post(
  '/:id/members',
  validateObjectId('id'),
  validateRequest,
  groupController.addGroupMember
);

// DELETE /api/groups/:id/members/:memberId - Gruptan üye çıkar
router.delete(
  '/:id/members/:memberId',
  validateObjectId('id'),
  validateObjectId('memberId'),
  validateRequest,
  groupController.removeGroupMember
);

// DELETE /api/groups/:id - Grubu sil
router.delete(
  '/:id',
  validateObjectId('id'),
  validateRequest,
  groupController.deleteGroup
);

export default router;