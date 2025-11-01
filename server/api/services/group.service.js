import Group from '../../models/group.model.js';
import User from '../../models/user.model.js';
import Chat from '../../models/chat.model.js';
import { GROUP_ROLES, ERROR_MESSAGES, HTTP_STATUS } from '../../utils/constants.js';
import ChatService from '../../api/services/chat.service.js';
//import { AppError } from '../../utils/errors.js';
import logger from '../../utils/logger.js';

export default class GroupService {
  static async getUserGroups(userId) {
    try {
      const groups = await Group.find({
        'members.user': userId
      }).populate([
        { path: 'members.user', select: 'username avatar' },
        { path: 'creator', select: 'username avatar' },
        { path: 'lastMessage' }
      ]);

      // Her grup için unread count ekle
      const groupsWithUnread = await Promise.all(
        groups.map(async group => {
          const chatId = group.chat; // Group şemasında chat referansı olmalı
          let unreadCount = 0;
          if (chatId) {
            unreadCount = await ChatService.getUnreadCount(chatId, userId);
          }

          return {
            _id: group._id,
            name: group.name,
            description: group.description,
            avatar: group.avatar,
            members: group.members,
            creator: group.creator,
            unreadCount: unreadCount || 0
          };
        })
      );

      return groupsWithUnread;
    } catch (error) {
      logger.error(`Get user groups error: ${error.message}`);
      throw error;
    }
  }

  // Yeni grup oluştur
  static async createGroup(creatorId, groupData) {
    try {
      const group = await Group.create({
        ...groupData,
        creator: creatorId,
        members: [{ user: creatorId, role: GROUP_ROLES.CREATOR }]
      });

      // Yeni bir private chat oluştur
      const chat = await Chat.create({
        type: 'group',
        groupId: group._id
      });

      group.chat = chat._id;
      await group.save();

      return group.populate('members.user', 'username avatar');
    } catch (error) {
      logger.error(`Create group error: ${error.message}`);
      throw error;
    }
  }

  // Gruba üye ekle (email ve rol ile)
  static async addMember(groupId, email, role, requesterId) {
    try {
      const group = await Group.findById(groupId);
      if (!group) {
        throw new AppError('Group not found', HTTP_STATUS.NOT_FOUND);
      }

      // Sadece admin/creator üye ekleyebilir
      const requester = group.members.find(m => m.user.equals(requesterId));
      if (!requester || ![GROUP_ROLES.CREATOR, GROUP_ROLES.ADMIN].includes(requester.role)) {
        throw new AppError('Not authorized to add members', HTTP_STATUS.FORBIDDEN);
      }

      // Kullanıcı kontrolü (email ile)
      const user = await User.findOne({ email });
      if (!user) {
        throw new AppError('User not found', HTTP_STATUS.NOT_FOUND);
      }

      // Zaten üye mi kontrolü
      const existingMember = group.members.find(m => m.user.equals(user._id));
      if (existingMember) {
        throw new AppError('User is already a member', HTTP_STATUS.CONFLICT);
      }

      // Üyeyi ekle
      group.members.push({ user: user._id, role: role || GROUP_ROLES.MEMBER });
      await group.save();

      return group.populate('members.user', 'username avatar');
    } catch (error) {
      logger.error(`Add member error: ${error.message}`);
      throw error;
    }
  }

  // Grup detaylarını getir
  static async getGroupDetails(groupId, userId) {
    try {
      const group = await Group.findOne({
        _id: groupId,
        'members.user': userId
      }).populate([
        { path: 'members.user', select: 'username avatar' },
        { path: 'creator', select: 'username avatar' },
        { path: 'lastMessage' }
      ]);

      if (!group) {
        throw new AppError('Group not found or not a member', HTTP_STATUS.NOT_FOUND);
      }

      return group;
    } catch (error) {
      logger.error(`Get group details error: ${error.message}`);
      throw error;
    }
  }
}