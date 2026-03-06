const { UserStats } = require('../models');
const { Guild } = require('../database/mongo');
const logger = require('../utils/logger');
const { EmbedBuilder } = require('discord.js');

class LevelingSystem {
  constructor(client) {
    this.client = client;
    this.cooldowns = new Map();
  }

  async initialize() {
    logger.info('[Leveling] System initialized');
    return this;
  }

  calculateXPForLevel(level) {
    return Math.floor(100 * Math.pow(1.5, level - 1));
  }

  calculateLevel(xp) {
    let level = 1;
    let xpNeeded = this.calculateXPForLevel(level);
    
    while (xp >= xpNeeded) {
      xp -= xpNeeded;
      level++;
      xpNeeded = this.calculateXPForLevel(level);
    }
    
    return { level, remainingXP: xp, nextLevelXP: xpNeeded };
  }

  async handleMessage(message) {
    if (message.author.bot) return;
    if (!message.guild) return;

    const guildData = await Guild.findOne({ guildId: message.guild.id }).lean();
    if (!guildData?.modules?.leveling) return;

    const config = guildData.leveling;
    if (!config?.enabled) return;

    if (config.ignoredChannels?.includes(message.channel.id)) return;
    if (config.ignoredRoles?.some(roleId => message.member?.roles.cache.has(roleId))) return;

    const cooldownKey = `${message.guild.id}-${message.author.id}`;
    const lastXP = this.cooldowns.get(cooldownKey);
    const now = Date.now();

    if (lastXP && now - lastXP < config.cooldown) return;

    const baseXP = config.xpPerMessage || 5;
    const multiplier = config.multiplier || 1;
    const xpGain = Math.floor(baseXP * multiplier * (0.8 + Math.random() * 0.4));

    await this.addXP(message.guild.id, message.author.id, xpGain);
    this.cooldowns.set(cooldownKey, now);
  }

  async handleCommand(interaction) {
    if (!interaction.guild) return;

    const guildData = await Guild.findOne({ guildId: interaction.guild.id }).lean();
    if (!guildData?.modules?.leveling) return;

    const config = guildData.leveling;
    if (!config?.enabled) return;

    const xpGain = config.xpPerCommand || 10;
    await this.addXP(interaction.guild.id, interaction.user.id, xpGain);
  }

  async addXP(guildId, userId, amount) {
    const stats = await UserStats.findOneAndUpdate(
      { userId, guildId },
      {
        $inc: {
          'xp.current': amount,
          'xp.total': amount
        },
        $set: { updatedAt: new Date() }
      },
      { new: true, upsert: true }
    );

    const levelData = this.calculateLevel(stats.xp.total);

    if (levelData.level > stats.xp.level) {
      await this.levelUp(guildId, userId, levelData.level, stats);
    }

    return stats;
  }

  async levelUp(guildId, userId, newLevel, stats) {
    await UserStats.findOneAndUpdate(
      { userId, guildId },
      { $set: { 'xp.level': newLevel } }
    );

    const guild = this.client.guilds.cache.get(guildId);
    if (!guild) return;

    const guildData = await Guild.findOne({ guildId }).lean();
    const config = guildData?.leveling;

    const member = await guild.members.fetch(userId).catch(() => null);
    if (!member) return;

    if (config?.roles?.length > 0) {
      for (const roleConfig of config.roles) {
        if (roleConfig.level === newLevel) {
          try {
            await member.roles.add(roleConfig.roleId);
            
            if (roleConfig.removePrevious) {
              const previousRoles = config.roles
                .filter(r => r.level < newLevel)
                .map(r => r.roleId);
              await member.roles.remove(previousRoles).catch(() => {});
            }
          } catch (err) {
            logger.error(`[Leveling] Error adding role:`, err);
          }
        }
      }
    }

    const embed = new EmbedBuilder()
      .setColor('#9932CC')
      .setTitle('🎉 Level Up!')
      .setDescription(`Congratulations ${member.user}! You've reached **Level ${newLevel}**!`)
      .setThumbnail(member.user.displayAvatarURL())
      .setTimestamp();

    const levelUpChannelId = guildData?.channels?.levelUp;
    if (levelUpChannelId) {
      const channel = guild.channels.cache.get(levelUpChannelId);
      if (channel) {
        await channel.send({ embeds: [embed] }).catch(() => {});
      }
    }

    try {
      await member.send({ embeds: [embed] }).catch(() => {});
    } catch (err) {}

    logger.info(`[Leveling] User ${userId} leveled up to ${newLevel} in ${guildId}`);
  }

  async getLeaderboard(guildId, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    
    return await UserStats.find({ guildId })
      .sort({ 'xp.level': -1, 'xp.total': -1 })
      .skip(skip)
      .limit(limit)
      .lean();
  }

  async getUserRank(guildId, userId) {
    const userStats = await UserStats.findOne({ userId, guildId }).lean();
    if (!userStats) return null;

    const rank = await UserStats.countDocuments({
      guildId,
      $or: [
        { 'xp.level': { $gt: userStats.xp.level } },
        {
          'xp.level': userStats.xp.level,
          'xp.total': { $gt: userStats.xp.total }
        }
      ]
    });

    return {
      rank: rank + 1,
      level: userStats.xp.level,
      xp: userStats.xp.total,
      ...this.calculateLevel(userStats.xp.total)
    };
  }

  async resetUser(guildId, userId) {
    await UserStats.findOneAndUpdate(
      { userId, guildId },
      {
        $set: {
          'xp.current': 0,
          'xp.total': 0,
          'xp.level': 1
        }
      }
    );

    logger.info(`[Leveling] Reset XP for user ${userId} in ${guildId}`);
  }

  async setLevel(guildId, userId, level) {
    const xp = this.calculateXPToReachLevel(level);
    
    await UserStats.findOneAndUpdate(
      { userId, guildId },
      {
        $set: {
          'xp.current': 0,
          'xp.total': xp,
          'xp.level': level
        }
      },
      { upsert: true }
    );

    logger.info(`[Leveling] Set level ${level} for user ${userId} in ${guildId}`);
  }

  calculateXPToReachLevel(targetLevel) {
    let totalXP = 0;
    for (let i = 1; i < targetLevel; i++) {
      totalXP += this.calculateXPForLevel(i);
    }
    return totalXP;
  }
}

module.exports = LevelingSystem;
