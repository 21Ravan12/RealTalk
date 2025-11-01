import GroupService from '../services/group.service.js';
import { success } from '../../utils/response.js';
import logger from '../../utils/logger.js';

export default class GroupController {
  static async getUserGroups(req, res, next) {
    try {
      const groups = await GroupService.getUserGroups(req.user._id);
      success(res, groups);
    } catch (error) {
      logger.error(`Get user groups failed: ${error.message}`);
      next(error);
    }
  }

  static async createGroup(req, res, next) {
    try {
      const group = await GroupService.createGroup(
        req.user._id,
        req.body
      );
      const message = 'Group created successfully!';
      success(res, group, message);
    } catch (error) {
      logger.error(`Create group failed: ${error.message}`);
      next(error);
    }
  }

  static async getGroup(req, res, next) {
    try {
      const group = await GroupService.getGroupDetails(
        req.params.id,
        req.user._id
      );
      success(res, group);
    } catch (error) {
      logger.error(`Get group failed: ${error.message}`);
      next(error);
    }
  }

  static async updateGroup(req, res, next) {
    try {
      const group = await GroupService.updateGroup(
        req.params.id,
        req.user._id,
        req.body
      );
      success(res, group);
    } catch (error) {
      logger.error(`Update group failed: ${error.message}`);
      next(error);
    }
  }

  static async addGroupMember(req, res, next) {
    try {
      const group = await GroupService.addMember(
        req.params.id,
        req.body.email,
        req.body.role,
        req.user._id
      );
      success(res, group);
    } catch (error) {
      logger.error(`Add group member failed: ${error.message}`);
      next(error);
    }
  }

  static async removeGroupMember(req, res, next) {
    try {
      const group = await GroupService.removeMember(
        req.params.id,
        req.body.userId,
        req.user._id
      );
      success(res, group);
    } catch (error) {
      logger.error(`Remove group member failed: ${error.message}`);
      next(error);
    }
  }
  
  static async deleteGroup(req, res, next) {
    try {
      await GroupService.deleteGroup(req.params.id, req.user._id);
      success(res, null, 204);
    } catch (error) {
      logger.error(`Delete group failed: ${error.message}`);
      next(error);
    }
  }
}