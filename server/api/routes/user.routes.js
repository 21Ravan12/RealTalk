import express from 'express';
const router = express.Router();
import userController from '../controllers/user.controller.js';
import { authenticate, restrictTo } from '../middlewares/auth.middleware.js';
import { validateObjectId, validateRequest } from '../middlewares/validation.middleware.js';
import multer from 'multer';

const upload = multer({ dest: 'tmp/' });

// GET /api/users - Tüm kullanıcılar (sadece admin)
router.get(
  '/',
  authenticate,
  restrictTo('admin'),
  userController.getAllUsers
);

// GET /api/users/me - Giriş yapan kullanıcı bilgileri
router.get('/me', authenticate, userController.getMe);

// GET /api/users/:id - Belirli bir kullanıcı
router.get(
  '/:id',
  validateObjectId('id'),
  validateRequest,
  userController.getUser 
);

router.patch(
  '/',
  validateRequest,
  upload.single('avatar'),    // avatar isimli dosyayı parse et
  authenticate,
  userController.updateUser
);

// DELETE /api/users/delete-me - Hesabı sil
router.delete('/delete-me', authenticate, userController.deleteUser);

// ADMIN ROUTES
router.use(authenticate, restrictTo('admin'));

// DELETE /api/users/:id - Kullanıcı sil (admin)
router.delete(
  '/:id',
  validateObjectId('id'),
  validateRequest,
  userController.deleteUser
);

export default router;