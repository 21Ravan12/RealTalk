import User from '../../models/user.model.js';
import { generateToken, verifyToken } from '../../config/jwt.config.js';
import { ERROR_MESSAGES, HTTP_STATUS } from '../../utils/constants.js';
import { hashPassword } from '../../utils/hash.js'; // You must have a hashPassword util
import { redisClient } from '../../config/redis.config.js'; // Your Redis client
import { sendCodeEmail } from '../../utils/email.js'; // Your email sending util
import logger from '../../utils/logger.js';
import crypto from 'crypto';

export default class AuthService {
  static async register(userData) {
  try {
    const { email, password, username, bio } = userData;

    // Kullanıcı veya isim zaten var mı kontrol et
    const existingUser = await User.findOne({ email });
    const existingName = await User.findOne({ username });
    if (existingUser || existingName) {
      throw new AppError(ERROR_MESSAGES.EMAIL_OR_NAME_IN_USE, HTTP_STATUS.CONFLICT);
    }

    // Şifreyi hashle
    const hashedPassword = await hashPassword(password);

    // Doğrulama kodu oluştur
    const randomCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 dakika

    // 64 karakter uzunluğunda hash key oluştur (SHA-256)
    const redisKey = crypto.createHash('sha256').update(`register:${email}`).digest('hex');

    // Redis'e geçici kullanıcı verisi kaydet
    await redisClient.set(
      redisKey,
      JSON.stringify({
        email,
        password: hashedPassword,
        username,
        bio,
        code: randomCode,
        expiresAt
      }),
      { EX: 15 * 60 } // 15 dakika sonra silinsin
    );

    // Doğrulama kodunu e-posta ile gönder
    await sendCodeEmail(email, randomCode);

    return { message: "Verification code sent successfully!", redisKey: redisKey };
  } catch (error) {
    logger.error(`Registration error: ${error.message}`);
    throw error;
  }
  }

  // Kullanıcı kayıt tamamlama servisi (Redis ile)
  static async completeRegistration(Data) {
  try {
    // Redis'ten geçici kullanıcı verisini al
    const userDataStr = await redisClient.get(Data.redisKey);

    if (!userDataStr) {
      throw new AppError('No registration data found or code expired.', HTTP_STATUS.BAD_REQUEST);
    }

    const userData = JSON.parse(userDataStr);

    // Kod eşleşmesini kontrol et
    if (String(userData.code) !== String(Data.verificationCode)) {
      throw new AppError('Invalid verification code.', HTTP_STATUS.BAD_REQUEST);
    }

    // Kodun süresi dolmuş mu kontrol et
    if (Date.now() > userData.expiresAt) {
      await redisClient.del(redisKey);
      throw new AppError('The verification code has expired.', HTTP_STATUS.BAD_REQUEST);
    }
    // Kullanıcıyı oluştur
    const user = await User.create({
      username: userData.username,
      email: userData.email,
      password: userData.password,
      bio: userData.bio,
    });

    // Redis'ten geçici veriyi sil
    await redisClient.del(Data.redisKey);

    // JWT token oluştur
    const token = generateToken({ id: user._id });

    // Şifreyi response'tan çıkar
    user.password = undefined;

    return { user, token };
  } catch (error) {
    logger.error(`Complete registration error: ${error.message}`);
    throw error;
  }
  }

  // Kullanıcı giriş servisi
  static async login(email, password) {
    try {
      // Kullanıcıyı email ile bul
      const user = await User.findOne({ email }).select('+password');
      
      // Kullanıcı veya şifre kontrolü
      if (!user || !(await user.comparePassword(password))) {
        return({message: ERROR_MESSAGES.INVALID_CREDENTIALS});
      }

      // JWT token oluştur
      const token = generateToken({ id: user._id });

      // Şifreyi response'tan çıkar
      user.password = undefined;

      return { user, token, message: "Login successful!" };
    } catch (error) {
      logger.error(`Login error: ${error.message}`);
      throw error;
    }
  }

  // Token yenileme servisi
  static async refreshToken(refreshToken) {
    try {
      // Token doğrulama
      const decoded = verifyToken(refreshToken);
      
      // Kullanıcıyı bul
      const user = await User.findById(decoded.id);
      if (!user) {
        throw new AppError('User not found', HTTP_STATUS.UNAUTHORIZED);
      }

      // Yeni token oluştur
      return generateToken({ id: user._id });
    } catch (error) {
      logger.error(`Token refresh error: ${error.message}`);
      throw new AppError('Invalid refresh token', HTTP_STATUS.UNAUTHORIZED);
    }
  }

  // Şifre sıfırlama tokenı oluşturma
  static async sendVerificationCodeForResetPassword(email) {
  try {
    // Kullanıcıyı e-posta ile bul
    const user = await User.findOne({ email });
    if (!user) {
      throw new AppError('User not found', HTTP_STATUS.NOT_FOUND);
    }

    // 6 haneli doğrulama kodu oluştur
    const verificationCode = String(Math.floor(100000 + Math.random() * 900000));

    // Geçerlilik süresi (timestamp formatında)
    const expiresAt = Date.now() + (15 * 60 * 1000); // 15 dakika

    // SHA-256 ile 64 karakterlik güvenli Redis anahtarı oluştur
    const redisKey = crypto
      .createHash('sha256')
      .update(`password-reset:${email}`)
      .digest('hex');

    // Redis'e geçici veriyi kaydet
    await redisClient.setEx(
      redisKey,
      15 * 60, // 15 dakika
      JSON.stringify({
        email,
        code: verificationCode,
        expiresAt
      })
    );

    // Kod e-posta ile gönder
    await sendCodeEmail(email, verificationCode);

    return {
      message: "Password recovery code sent successfully!",
      redisKey
    };

  } catch (error) {
    logger.error(`Password reset token error: ${error.stack || error.message}`);
    throw error;
  }
  }

  // Şifre sıfırlama kodunu doğrulama
  static async verifyCodeForResetPassword(data) {
  try {
    const { redisKey, verificationCode } = data;

    // Redis'ten geçici veriyi al
    const resetDataStr = await redisClient.get(redisKey);
    if (!resetDataStr) {
      throw new AppError('No reset data found or code expired.', HTTP_STATUS.BAD_REQUEST);
    }

    const resetData = JSON.parse(resetDataStr);

    // Kod eşleşmesini kontrol et
    if (String(resetData.code) !== String(verificationCode)) {
      throw new AppError('Invalid verification code.', HTTP_STATUS.BAD_REQUEST);
    }

    // Kodun süresi dolmuş mu kontrol et
    if (Date.now() > resetData.expiresAt) {
      await redisClient.del(redisKey);
      throw new AppError('The verification code has expired.', HTTP_STATUS.BAD_REQUEST);
    }

    // Yeni şifre için token oluştur
    const token = generateToken({ email: resetData.email });
    console.log('Generated reset token:', token);

    return { token };
  } catch (error) {
    logger.error(`Verify code error: ${error.message}`);
    throw error;
  }
  }

  // Şifre sıfırlama işlemi
  static async resetPassword(token, newPassword) {
  try {
    // Token'ı doğrula
    const decoded = verifyToken(token);
    if (!decoded || !decoded.email) {
      throw new AppError('Invalid or expired token.', HTTP_STATUS.UNAUTHORIZED);
    }

    // Kullanıcıyı e-posta ile bul
    const user = await User.findOne({ email: decoded.email });
    if (!user) {
      throw new AppError('User not found', HTTP_STATUS.NOT_FOUND);
    }

    // Yeni şifreyi hashle
    user.password = await hashPassword(newPassword);

    // Kullanıcıyı güncelle
    await user.save();

    return { message: 'Password reset successfully!' };
  } catch (error) {
    logger.error(`Reset password error: ${error.message}`);
    throw error;
  }
}
}