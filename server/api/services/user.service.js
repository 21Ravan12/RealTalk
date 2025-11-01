import User from '../../models/user.model.js';
import { ERROR_MESSAGES, HTTP_STATUS } from '../../utils/constants.js';
//import { AppError } from '../../utils/errors.js';
import logger from '../../utils/logger.js';
import fs from 'fs/promises';
import path from "path";

export default class UserService {
  // Tüm kullanıcıları getir
  static async getAllUsers(queryParams) {
    try {
      // Filtreleme, sıralama, sayfalama
      const users = await User.find()
        .sort(queryParams.sort)
        .select('-password -__v');

      return users;
    } catch (error) {
      logger.error(`Get all users error: ${error.message}`);
      throw error;
    }
  }

  // Kullanıcı detaylarını getir
  static async getUserById(userId) {
    try {
      const user = await User.findById(userId)
        .select('-password -__v')
        .populate('friends', 'username avatar');

      if (!user) {
        throw new AppError(ERROR_MESSAGES.NOT_FOUND, HTTP_STATUS.NOT_FOUND);
      }

      return user;
    } catch (error) {
      logger.error(`Get user error: ${error.message}`);
      throw error;
    }
  }

static async updateUser(userId, updateData, file) {
  try {
    console.log('Update data:', updateData);
    if (file) {
      const oldUser = await User.findById(userId);

      // Eski avatarı sil
      if (oldUser?.avatar) {
        const oldPath = path.join('public', oldUser.avatar);
        await fs.unlink(oldPath).catch(() => {});
      }

      // Kullanıcıya özel klasör oluştur
      const uploadDir = path.join('public', 'img', String(userId));
      await fs.mkdir(uploadDir, { recursive: true });

      // Yeni dosyayı taşı
      const uploadPath = path.join(uploadDir, file.filename);
      await fs.rename(file.path, uploadPath);

      // Yeni dosya yolunu güncelle
      updateData.avatar = `/img/${String(userId)}/${file.filename}`;
    }

    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password -__v');

    if (!user) {
      throw new AppError(ERROR_MESSAGES.NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    return user;
  } catch (error) {
    logger.error(`Update user error: ${error.message}`);
    throw error;
  }
}

  // Kullanıcı silme
  static async deleteUser(userId) {
    try {
      const user = await User.findByIdAndDelete(userId);
      
      if (!user) {
        throw new AppError(ERROR_MESSAGES.NOT_FOUND, HTTP_STATUS.NOT_FOUND);
      }

      // Kullanıcı avatarını sil
      if (user.avatar && !user.avatar.includes('default')) {
        const avatarPath = path.join('public', user.avatar);
        await fs.unlink(avatarPath).catch(err => logger.error(err));
      }

      return { message: 'User deleted successfully' };
    } catch (error) {
      logger.error(`Delete user error: ${error.message}`);
      throw error;
    }
  }

  // Çevrimiçi durum güncelleme
  static async updateOnlineStatus(userId, isOnline) {
    try {
      return await User.findByIdAndUpdate(
        userId,
        { lastSeen: isOnline ? null : new Date() },
        { new: true }
      );
    } catch (error) {
      logger.error(`Update online status error: ${error.message}`);
      throw error;
    }
  }
}