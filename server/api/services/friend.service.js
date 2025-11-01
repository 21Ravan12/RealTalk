import Friend from '../../models/friend.model.js';
import User from '../../models/user.model.js';
import Chat from '../../models/chat.model.js';
import { FRIEND_STATUS, ERROR_MESSAGES, HTTP_STATUS } from '../../utils/constants.js';
import ChatService from '../../api/services/chat.service.js';
import AppError from '../../utils/AppError.js';
import logger from '../../utils/logger.js';

export default class FriendService {
  static async getFriends(userId) {
    try {
      const friends = await Friend.find({
        $or: [{ user: userId }],
      })
        .populate('friend', 'username avatar email lastSeen chat'); // Chat alanı da gelmeli

      // Her arkadaş için unread count'u al
      const formattedFriends = await Promise.all(
        friends.map(async f => {
          const chatId = f.chat || null;
          let unreadCount = 0;
          if (chatId) {
            console.log('Fetching unread count for chatId:', chatId, 'and userId:', userId);
            unreadCount = await ChatService.getUnreadCount(chatId, userId);
          }
          return {
            _id: f.friend._id,
            email: f.friend.email,
            name: f.friend.username,
            profileImage: f.friend.avatar,
            lastSeen: f.friend.lastSeen,
            chatId: f.chat,
            unreadCount: unreadCount || 0
          };
        })
      );

      return formattedFriends;
    } catch (error) {
      logger.error(`Get friends error: ${error.message}`);
      throw error;
    }
  }

  static async sendFriendRequest(userId, email) {
  try {
    // Kullanıcı kontrolü
    const friendUser = await User.findOne({ email });
    if (!friendUser) {
      throw new AppError('User not found', HTTP_STATUS.NOT_FOUND);
    }

    // Kendine istek gönderme kontrolü
    if (friendUser._id.equals(userId)) {
      throw new AppError('You cannot send friend request to yourself', HTTP_STATUS.BAD_REQUEST);
    }

    // Zaten var olan istek kontrolü
    const existingRequest = await Friend.findOne({
      $or: [
        { user: userId, friend: friendUser._id },
        { user: friendUser._id, friend: userId }
      ]
    });

    if (existingRequest) {
      throw new AppError('Friend request already exists', HTTP_STATUS.CONFLICT);
    }

    // Yeni istek oluştur
    const friendRequest = await Friend.create({
      user: userId,
      friend: friendUser._id,
      status: FRIEND_STATUS.PENDING
    });
   
    const userRequest = await Friend.create({
      user: friendUser._id,
      friend: userId,
      status: FRIEND_STATUS.PENDING
    });

    // Yeni bir private chat oluştur
    const chat = await Chat.create({
      type: 'private',
      participants: [userId, friendUser._id]
    });

    friendRequest.chat = chat._id;
    userRequest.chat = chat._id;
    await friendRequest.save();
    await userRequest.save();

    return await friendRequest.populate('user friend', 'username avatar');
  } catch (error) {
    logger.error(`Send friend request error: ${error.message}`);
    throw error;
  }
  }

  // Arkadaşlık isteğini kabul et
  static async acceptFriendRequest(requestId, userId) {
    try {
      const request = await Friend.findById(requestId)
        .populate('user friend', 'username avatar');

      if (!request) {
        throw new AppError('Friend request not found', HTTP_STATUS.NOT_FOUND);
      }

      // Sadece alıcı kabul edebilir
      if (!request.friend._id.equals(userId)) {
        throw new AppError('Not authorized to accept this request', HTTP_STATUS.FORBIDDEN);
      }

      // İsteği kabul et
      request.status = FRIEND_STATUS.ACCEPTED;
      await request.save();

      // Karşılıklı arkadaşlık kaydı oluştur
      await Friend.findOneAndUpdate(
        { user: request.friend._id, friend: request.user._id },
        { status: FRIEND_STATUS.ACCEPTED },
        { upsert: true }
      );

      return request;
    } catch (error) {
      logger.error(`Accept friend request error: ${error.message}`);
      throw error;
    }
  }
}