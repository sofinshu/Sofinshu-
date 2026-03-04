const { ModerationLog } = require('../models');
const { UserStats, User, Guild } = require('../database/mongo');
const logger = require('../utils/logger');
const { EmbedBuilder } = require('discord.js');

class ModerationSystem {
  constructor(client) {
    this.client = client;
    this.activeMutes = new Map();
  }

  async initialize() {
    logger.info('[Moderation] System initialized');
    this.restoreActiveMutes();
    return this;
  }

  async restoreActiveMutes() {
    const activeMutes = await ModerationLog.find({
      action: 'mute',
      active: true,
      expiresAt: { $gt: new Date() }
    });

    for (const mute of activeMutes) {
      const guild = this.client.guilds.cache.get(mute.guildId);
      if (!guild) continue;

      const member = await guild.members.fetch(mute.userId).catch(() => null);
      if (!member) continue;

      const timeRemaining = mute.expiresAt.getTime() - Date.now();
      if (timeRemaining > 0) {
        setTimeout(() => {
          this.unmute(mute.guildId, mute.userId, this.client.user.id, 'Mute duration expired');
        }, timeRemaining);
      }
    }
  }

  async warn(guildId, userId, reason, moderatorId, severity = 'medium') {
    const points = { low: 1, medium: 2, high: 3 }[severity] || 2;

    const log = new ModerationLog({
      guildId,
      userId,
      moderatorId,
      action: 'warn',
      reason,
      severity,
      points
    });

    await log.save();

    await UserStats.findOneAndUpdate(
      { userId, guildId },
      {
        $inc: { 'staff.warnings': 1, 'moderation.warnings': 1 },
        $set: { 'moderation.lastPunishment': new Date() }
      },
      { upsert: true }
    );

    await User.findOneAndUpdate(
      { userId, 'guilds.guildId': guildId },
      { $inc: { 'guilds.$.staff.warnings': 1 } }
    );

    await this.logAction(guildId, 'warn', userId, moderatorId, reason, severity);

    const warningCount = await ModerationLog.countDocuments({
      guildId,
      userId,
      action: 'warn',
      active: true
    });

    return { log, warningCount };
  }

  async mute(guildId, userId, duration, reason, moderatorId) {
    const guild = this.client.guilds.cache.get(guildId);
    if (!guild) throw new Error('Guild not found');

    const member = await guild.members.fetch(userId).catch(() => null);
    if (!member) throw new Error('User not found');

    const guildData = await Guild.findOne({ guildId }).lean();
    const mutedRoleId = guildData?.settings?.mutedRole || guildData?.roles?.muted;

    if (!mutedRoleId) {
      throw new Error('Muted role not configured');
    }

    await member.roles.add(mutedRoleId);

    const expiresAt = duration ? new Date(Date.now() + duration) : null;

    const log = new ModerationLog({
      guildId,
      userId,
      moderatorId,
      action: 'mute',
      reason,
      duration,
      expiresAt,
      active: true
    });

    await log.save();

    await UserStats.findOneAndUpdate(
      { userId, guildId },
      {
        $inc: { 'moderation.mutes': 1 },
        $set: { 'moderation.lastPunishment': new Date() }
      },
      { upsert: true }
    );

    await this.logAction(guildId, 'mute', userId, moderatorId, reason, null, duration);

    if (duration) {
      setTimeout(() => {
        this.unmute(guildId, userId, this.client.user.id, 'Mute duration expired');
      }, duration);
    }

    return log;
  }

  async unmute(guildId, userId, moderatorId, reason = 'Mute duration expired') {
    const guild = this.client.guilds.cache.get(guildId);
    if (!guild) return;

    const member = await guild.members.fetch(userId).catch(() => null);
    
    const guildData = await Guild.findOne({ guildId }).lean();
    const mutedRoleId = guildData?.settings?.mutedRole || guildData?.roles?.muted;

    if (member && mutedRoleId) {
      await member.roles.remove(mutedRoleId).catch(() => {});
    }

    await ModerationLog.updateMany(
      { guildId, userId, action: 'mute', active: true },
      { $set: { active: false } }
    );

    const log = new ModerationLog({
      guildId,
      userId,
      moderatorId,
      action: 'untimeout',
      reason
    });

    await log.save();
    await this.logAction(guildId, 'unmute', userId, moderatorId, reason);

    return log;
  }

  async kick(guildId, userId, reason, moderatorId) {
    const guild = this.client.guilds.cache.get(guildId);
    if (!guild) throw new Error('Guild not found');

    const member = await guild.members.fetch(userId).catch(() => null);
    if (!member) throw new Error('User not found');

    const log = new ModerationLog({
      guildId,
      userId,
      moderatorId,
      action: 'kick',
      reason
    });

    await log.save();

    await UserStats.findOneAndUpdate(
      { userId, guildId },
      {
        $inc: { 'moderation.kicks': 1 },
        $set: { 'moderation.lastPunishment': new Date() }
      },
      { upsert: true }
    );

    await this.logAction(guildId, 'kick', userId, moderatorId, reason);

    await member.kick(reason);

    return log;
  }

  async ban(guildId, userId, duration, reason, moderatorId, deleteMessages = 0) {
    const guild = this.client.guilds.cache.get(guildId);
    if (!guild) throw new Error('Guild not found');

    const log = new ModerationLog({
      guildId,
      userId,
      moderatorId,
      action: 'ban',
      reason,
      duration,
      expiresAt: duration ? new Date(Date.now() + duration) : null,
      active: true
    });

    await log.save();

    await UserStats.findOneAndUpdate(
      { userId, guildId },
      {
        $inc: { 'moderation.bans': 1 },
        $set: { 'moderation.lastPunishment': new Date() }
      },
      { upsert: true }
    );

    await this.logAction(guildId, 'ban', userId, moderatorId, reason, null, duration);

    await guild.members.ban(userId, {
      deleteMessageDays: deleteMessages,
      reason: `${reason} - By ${moderatorId}`
    });

    if (duration) {
      setTimeout(() => {
        this.unban(guildId, userId, this.client.user.id, 'Ban duration expired');
      }, duration);
    }

    return log;
  }

  async unban(guildId, userId, moderatorId, reason = 'Ban lifted') {
    const guild = this.client.guilds.cache.get(guildId);
    if (!guild) return;

    await guild.members.unban(userId, reason).catch(() => {});

    await ModerationLog.updateMany(
      { guildId, userId, action: 'ban', active: true },
      { $set: { active: false } }
    );

    const log = new ModerationLog({
      guildId,
      userId,
      moderatorId,
      action: 'unban',
      reason
    });

    await log.save();
    await this.logAction(guildId, 'unban', userId, moderatorId, reason);

    return log;
  }

  async timeout(guildId, userId, duration, reason, moderatorId) {
    const guild = this.client.guilds.cache.get(guildId);
    if (!guild) throw new Error('Guild not found');

    const member = await guild.members.fetch(userId).catch(() => null);
    if (!member) throw new Error('User not found');

    await member.timeout(duration, reason);

    const log = new ModerationLog({
      guildId,
      userId,
      moderatorId,
      action: 'timeout',
      reason,
      duration,
      expiresAt: new Date(Date.now() + duration),
      active: true
    });

    await log.save();
    await this.logAction(guildId, 'timeout', userId, moderatorId, reason, null, duration);

    return log;
  }

  async getCase(caseId) {
    return await ModerationLog.findById(caseId).lean();
  }

  async getUserHistory(guildId, userId, limit = 50) {
    return await ModerationLog.find({ guildId, userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  }

  async getModeratorStats(guildId, moderatorId, days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const stats = await ModerationLog.aggregate([
      {
        $match: {
          guildId,
          moderatorId,
          createdAt: { $gte: since }
        }
      },
      {
        $group: {
          _id: '$action',
          count: { $sum: 1 }
        }
      }
    ]);

    const total = stats.reduce((sum, s) => sum + s.count, 0);
    const byAction = {};
    stats.forEach(s => byAction[s._id] = s.count);

    return { total, byAction, days };
  }

  async deleteCase(caseId, moderatorId) {
    const caseData = await ModerationLog.findById(caseId);
    if (!caseData) return null;

    if (caseData.active && caseData.action === 'mute') {
      await this.unmute(caseData.guildId, caseData.userId, moderatorId, 'Case deleted');
    }

    await ModerationLog.findByIdAndDelete(caseId);
    
    await this.logAction(
      caseData.guildId,
      'case_deleted',
      caseData.userId,
      moderatorId,
      `Case #${caseId} deleted`
    );

    return caseData;
  }

  async editCase(caseId, updates, moderatorId) {
    const caseData = await ModerationLog.findByIdAndUpdate(
      caseId,
      { $set: updates },
      { new: true }
    );

    await this.logAction(
      caseData.guildId,
      'case_edited',
      caseData.userId,
      moderatorId,
      `Case #${caseId} edited`
    );

    return caseData;
  }

  async logAction(guildId, action, userId, moderatorId, reason, severity = null, duration = null) {
    const guild = this.client.guilds.cache.get(guildId);
    if (!guild) return;

    const guildData = await Guild.findOne({ guildId }).lean();
    const logChannelId = guildData?.channels?.modLogs;

    if (!logChannelId) return;

    const channel = guild.channels.cache.get(logChannelId);
    if (!channel) return;

    const user = await this.client.users.fetch(userId).catch(() => null);
    const moderator = await this.client.users.fetch(moderatorId).catch(() => null);

    const actionEmojis = {
      warn: '⚠️',
      mute: '🔇',
      unmute: '🔊',
      kick: '👢',
      ban: '🔨',
      unban: '🔓',
      timeout: '⏱️',
      case_deleted: '🗑️',
      case_edited: '✏️'
    };

    const embed = new EmbedBuilder()
      .setColor(this.getActionColor(action))
      .setTitle(`${actionEmojis[action] || '📝'} ${action.charAt(0).toUpperCase() + action.slice(1)}`)
      .addFields(
        { name: 'User', value: user ? `${user.tag} (${userId})` : userId, inline: true },
        { name: 'Moderator', value: moderator ? moderator.tag : moderatorId, inline: true }
      )
      .setTimestamp();

    if (reason) {
      embed.addFields({ name: 'Reason', value: reason, inline: false });
    }

    if (severity) {
      embed.addFields({ name: 'Severity', value: severity, inline: true });
    }

    if (duration) {
      embed.addFields({ name: 'Duration', value: this.formatDuration(duration), inline: true });
    }

    await channel.send({ embeds: [embed] }).catch(() => {});
  }

  getActionColor(action) {
    const colors = {
      warn: '#FFFF00',
      mute: '#FFA500',
      unmute: '#00FF00',
      kick: '#FF8C00',
      ban: '#FF0000',
      unban: '#00FF00',
      timeout: '#FFD700',
      case_deleted: '#808080',
      case_edited: '#4169E1'
    };
    return colors[action] || '#808080';
  }

  formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  async clearWarnings(guildId, userId, moderatorId, reason) {
    const result = await ModerationLog.deleteMany({
      guildId,
      userId,
      action: 'warn'
    });

    await UserStats.findOneAndUpdate(
      { userId, guildId },
      { $set: { 'staff.warnings': 0 } }
    );

    await User.findOneAndUpdate(
      { userId, 'guilds.guildId': guildId },
      { $set: { 'guilds.$.staff.warnings': 0 } }
    );

    await this.logAction(guildId, 'warnings_cleared', userId, moderatorId, reason);

    return result.deletedCount;
  }
}

module.exports = ModerationSystem;
