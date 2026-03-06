const { UserStats, Promotion } = require('../models');
const { User, Guild, Warning, Shift } = require('../database/mongo');
const logger = require('../utils/logger');
const { EmbedBuilder } = require('discord.js');

class StaffManagementSystem {
  constructor(client) {
    this.client = client;
  }

  async initialize() {
    logger.info('[StaffManagement] System initialized');
    return this;
  }

  async getStaffProfile(guildId, userId) {
    const stats = await UserStats.findOne({ userId, guildId }).lean();
    const user = await User.findOne({ userId }).lean();
    const guildData = await Guild.findOne({ guildId }).lean();
    
    if (!stats) {
      return null;
    }

    const recentWarnings = await Warning.find({
      guildId,
      userId
    }).sort({ createdAt: -1 }).limit(5).lean();

    const recentShifts = await Shift.find({
      guildId,
      userId,
      status: 'ended'
    }).sort({ endTime: -1 }).limit(5).lean();

    const promotionHistory = await Promotion.find({
      guildId,
      userId
    }).sort({ createdAt: -1 }).limit(5).lean();

    return {
      userId,
      username: user?.username || 'Unknown',
      globalName: user?.globalName,
      avatar: user?.avatar,
      rank: stats.staff.rank,
      points: stats.staff.points,
      shifts: stats.staff.shifts,
      shiftMinutes: stats.staff.shiftMinutes,
      consistency: stats.staff.consistency,
      warnings: stats.staff.warnings,
      reputation: stats.staff.reputation,
      achievements: stats.staff.achievements,
      joinedStaffAt: stats.staff.joinedStaffAt,
      lastPromotionAt: stats.staff.lastPromotionAt,
      recentWarnings,
      recentShifts,
      promotionHistory,
      nextRank: this.getNextRank(stats.staff.rank, guildData?.rankRoles),
      rankProgress: await this.calculateRankProgress(guildId, userId, stats)
    };
  }

  getNextRank(currentRank, rankRoles) {
    const ranks = ['trial', 'staff', 'senior', 'manager', 'admin'];
    const currentIndex = ranks.indexOf(currentRank);
    
    if (currentIndex === -1 || currentIndex === ranks.length - 1) {
      return null;
    }
    
    return ranks[currentIndex + 1];
  }

  async calculateRankProgress(guildId, userId, stats) {
    const guildData = await Guild.findOne({ guildId }).lean();
    if (!guildData) return null;

    const nextRank = this.getNextRank(stats.staff.rank, guildData.rankRoles);
    if (!nextRank) return null;

    const requirements = guildData.promotionRequirements?.[nextRank];
    if (!requirements) return null;

    const progress = {
      rank: nextRank,
      overall: 0,
      criteria: {}
    };

    let totalCriteria = 0;
    let metCriteria = 0;

    if (requirements.points > 0) {
      totalCriteria++;
      const pct = Math.min(100, (stats.staff.points / requirements.points) * 100);
      if (pct >= 100) metCriteria++;
      progress.criteria.points = {
        current: stats.staff.points,
        required: requirements.points,
        percentage: pct,
        met: pct >= 100
      };
    }

    if (requirements.shifts > 0) {
      totalCriteria++;
      const pct = Math.min(100, (stats.staff.shifts / requirements.shifts) * 100);
      if (pct >= 100) metCriteria++;
      progress.criteria.shifts = {
        current: stats.staff.shifts,
        required: requirements.shifts,
        percentage: pct,
        met: pct >= 100
      };
    }

    if (requirements.consistency > 0) {
      totalCriteria++;
      const pct = Math.min(100, (stats.staff.consistency / requirements.consistency) * 100);
      if (pct >= 100) metCriteria++;
      progress.criteria.consistency = {
        current: stats.staff.consistency,
        required: requirements.consistency,
        percentage: pct,
        met: pct >= 100
      };
    }

    if (requirements.maxWarnings !== undefined) {
      totalCriteria++;
      const met = stats.staff.warnings <= requirements.maxWarnings;
      if (met) metCriteria++;
      progress.criteria.warnings = {
        current: stats.staff.warnings,
        maxAllowed: requirements.maxWarnings,
        met
      };
    }

    progress.overall = Math.round((metCriteria / totalCriteria) * 100);
    progress.ready = metCriteria === totalCriteria;

    return progress;
  }

  async addPoints(guildId, userId, points, reason, moderatorId) {
    const stats = await UserStats.findOneAndUpdate(
      { userId, guildId },
      {
        $inc: { 'staff.points': points },
        $set: { updatedAt: new Date() }
      },
      { new: true, upsert: true }
    );

    await User.findOneAndUpdate(
      { userId, 'guilds.guildId': guildId },
      { $inc: { 'guilds.$.staff.points': points } }
    );

    logger.info(`[StaffManagement] Added ${points} points to ${userId} in ${guildId}: ${reason}`);

    await this.logStaffAction(guildId, userId, 'points_added', {
      points,
      reason,
      moderatorId,
      newTotal: stats.staff.points
    });

    return stats;
  }

  async removePoints(guildId, userId, points, reason, moderatorId) {
    const stats = await UserStats.findOneAndUpdate(
      { userId, guildId },
      {
        $inc: { 'staff.points': -points },
        $set: { updatedAt: new Date() }
      },
      { new: true }
    );

    await User.findOneAndUpdate(
      { userId, 'guilds.guildId': guildId },
      { $inc: { 'guilds.$.staff.points': -points } }
    );

    logger.info(`[StaffManagement] Removed ${points} points from ${userId} in ${guildId}: ${reason}`);

    await this.logStaffAction(guildId, userId, 'points_removed', {
      points,
      reason,
      moderatorId,
      newTotal: stats.staff.points
    });

    return stats;
  }

  async promote(guildId, userId, newRank, moderatorId, reason = '') {
    const stats = await UserStats.findOne({ userId, guildId });
    if (!stats) throw new Error('User not found');

    const oldRank = stats.staff.rank;

    await UserStats.findOneAndUpdate(
      { userId, guildId },
      {
        $set: {
          'staff.rank': newRank,
          'staff.lastPromotionAt': new Date(),
          updatedAt: new Date()
        }
      }
    );

    await User.findOneAndUpdate(
      { userId, 'guilds.guildId': guildId },
      {
        $set: {
          'guilds.$.staff.rank': newRank,
          'guilds.$.staff.lastPromotionDate': new Date()
        }
      }
    );

    const promotion = new Promotion({
      guildId,
      userId,
      fromRank: oldRank,
      toRank: newRank,
      promotedBy: moderatorId,
      promotionType: 'manual',
      criteria: {
        points: stats.staff.points,
        shifts: stats.staff.shifts,
        consistency: stats.staff.consistency,
        warnings: stats.staff.warnings
      },
      approved: true,
      approvedBy: moderatorId,
      approvedAt: new Date()
    });

    await promotion.save();

    logger.info(`[StaffManagement] Promoted ${userId} from ${oldRank} to ${newRank} in ${guildId}`);

    await this.logStaffAction(guildId, userId, 'promoted', {
      oldRank,
      newRank,
      reason,
      moderatorId
    });

    return promotion;
  }

  async demote(guildId, userId, newRank, moderatorId, reason = '') {
    const stats = await UserStats.findOne({ userId, guildId });
    if (!stats) throw new Error('User not found');

    const oldRank = stats.staff.rank;

    await UserStats.findOneAndUpdate(
      { userId, guildId },
      {
        $set: {
          'staff.rank': newRank,
          updatedAt: new Date()
        },
        $inc: { 'staff.strikes': 1 }
      }
    );

    await User.findOneAndUpdate(
      { userId, 'guilds.guildId': guildId },
      { $set: { 'guilds.$.staff.rank': newRank } }
    );

    logger.info(`[StaffManagement] Demoted ${userId} from ${oldRank} to ${newRank} in ${guildId}`);

    await this.logStaffAction(guildId, userId, 'demoted', {
      oldRank,
      newRank,
      reason,
      moderatorId
    });

    return { oldRank, newRank };
  }

  async addReputation(guildId, userId, amount, reason, fromUserId) {
    const stats = await UserStats.findOneAndUpdate(
      { userId, guildId },
      {
        $inc: { 'staff.reputation': amount },
        $set: { updatedAt: new Date() }
      },
      { new: true, upsert: true }
    );

    await this.logStaffAction(guildId, userId, 'reputation_added', {
      amount,
      reason,
      fromUserId,
      newTotal: stats.staff.reputation
    });

    return stats;
  }

  async awardAchievement(guildId, userId, achievementId, achievementName) {
    const stats = await UserStats.findOneAndUpdate(
      { userId, guildId },
      {
        $addToSet: { 'staff.achievements': achievementId },
        $set: { updatedAt: new Date() }
      },
      { new: true }
    );

    await User.findOneAndUpdate(
      { userId, 'guilds.guildId': guildId },
      { $addToSet: { 'guilds.$.staff.achievements': achievementId } }
    );

    logger.info(`[StaffManagement] Awarded achievement ${achievementId} to ${userId} in ${guildId}`);

    return stats;
  }

  async getLeaderboard(guildId, limit = 10, sortBy = 'points') {
    const sortField = sortBy === 'shifts' ? 'staff.shifts' : 'staff.points';
    
    return await UserStats.find({ guildId })
      .sort({ [sortField]: -1 })
      .limit(limit)
      .lean();
  }

  async getStaffList(guildId, rank = null) {
    const query = { guildId };
    if (rank) {
      query['staff.rank'] = rank;
    }

    return await UserStats.find(query)
      .sort({ 'staff.points': -1 })
      .lean();
  }

  async getActivitySummary(guildId, days = 7) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    const shifts = await Shift.aggregate([
      { $match: { guildId, startTime: { $gte: since } } },
      {
        $group: {
          _id: '$userId',
          totalShifts: { $sum: 1 },
          totalMinutes: { $sum: '$duration' }
        }
      }
    ]);

    const totalStaff = await UserStats.countDocuments({ guildId });
    const activeStaff = shifts.length;

    return {
      totalStaff,
      activeStaff,
      inactiveStaff: totalStaff - activeStaff,
      activityRate: totalStaff > 0 ? Math.round((activeStaff / totalStaff) * 100) : 0,
      shifts
    };
  }

  async updateConsistency(guildId, userId) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const shifts = await Shift.find({
      guildId,
      userId,
      startTime: { $gte: thirtyDaysAgo },
      status: 'ended'
    });

    const uniqueDays = new Set(shifts.map(s => s.startTime.toISOString().split('T')[0])).size;
    const consistency = Math.min(100, Math.round((uniqueDays / 30) * 100));

    await UserStats.findOneAndUpdate(
      { userId, guildId },
      { $set: { 'staff.consistency': consistency, updatedAt: new Date() } }
    );

    return consistency;
  }

  async logStaffAction(guildId, userId, action, data) {
    const guild = this.client.guilds.cache.get(guildId);
    if (!guild) return;

    const guildData = await Guild.findOne({ guildId }).lean();
    const logChannelId = guildData?.channels?.logs;
    
    if (!logChannelId) return;

    const channel = guild.channels.cache.get(logChannelId);
    if (!channel) return;

    const user = await this.client.users.fetch(userId).catch(() => null);
    const moderator = data.moderatorId ? await this.client.users.fetch(data.moderatorId).catch(() => null) : null;

    const embed = new EmbedBuilder()
      .setColor(this.getActionColor(action))
      .setTitle(this.getActionTitle(action))
      .addFields(
        { name: 'Staff Member', value: user ? `${user.tag} (${userId})` : userId, inline: true }
      )
      .setTimestamp();

    if (moderator) {
      embed.addFields({ name: 'Moderator', value: moderator.tag, inline: true });
    }

    if (data.points) {
      embed.addFields({ name: 'Points', value: `${data.points > 0 ? '+' : ''}${data.points}`, inline: true });
    }

    if (data.reason) {
      embed.addFields({ name: 'Reason', value: data.reason, inline: false });
    }

    if (data.oldRank && data.newRank) {
      embed.addFields(
        { name: 'Old Rank', value: data.oldRank, inline: true },
        { name: 'New Rank', value: data.newRank, inline: true }
      );
    }

    await channel.send({ embeds: [embed] }).catch(() => {});
  }

  getActionColor(action) {
    const colors = {
      points_added: '#00FF00',
      points_removed: '#FF0000',
      promoted: '#FFD700',
      demoted: '#FFA500',
      reputation_added: '#00CED1',
      achievement_awarded: '#9932CC'
    };
    return colors[action] || '#808080';
  }

  getActionTitle(action) {
    const titles = {
      points_added: 'Points Added',
      points_removed: 'Points Removed',
      promoted: 'Staff Promoted',
      demoted: 'Staff Demoted',
      reputation_added: 'Reputation Added',
      achievement_awarded: 'Achievement Awarded'
    };
    return titles[action] || 'Staff Action';
  }
}

module.exports = StaffManagementSystem;
