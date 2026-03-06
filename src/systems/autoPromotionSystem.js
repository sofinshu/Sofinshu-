const { AutoPromotionRule, Promotion, UserStats } = require('../models');
const { Guild, User } = require('../database/mongo');
const logger = require('../utils/logger');
const { EmbedBuilder } = require('discord.js');

class AutoPromotionSystem {
  constructor(client) {
    this.client = client;
    this.checkInterval = null;
    this.isRunning = false;
  }

  async initialize() {
    logger.info('[AutoPromotion] Initializing system...');
    this.startChecker();
    return this;
  }

  startChecker() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.checkInterval = setInterval(() => {
      this.checkAllGuilds();
    }, 3600000);
    
    logger.info('[AutoPromotion] Checker started - running every hour');
  }

  stopChecker() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.isRunning = false;
    logger.info('[AutoPromotion] Checker stopped');
  }

  async checkAllGuilds() {
    try {
      const guilds = await Guild.find({ 'modules.autoPromotion': true }).lean();
      
      for (const guildData of guilds) {
        try {
          await this.checkGuildPromotions(guildData.guildId);
        } catch (err) {
          logger.error(`[AutoPromotion] Error checking guild ${guildData.guildId}:`, err);
        }
      }
    } catch (err) {
      logger.error('[AutoPromotion] Error in checkAllGuilds:', err);
    }
  }

  async checkGuildPromotions(guildId) {
    const rules = await AutoPromotionRule.find({ 
      guildId, 
      enabled: true 
    }).sort({ priority: -1 }).lean();

    if (!rules.length) return;

    const guild = this.client.guilds.cache.get(guildId);
    if (!guild) {
      logger.warn(`[AutoPromotion] Guild ${guildId} not found in cache`);
      return;
    }

    for (const rule of rules) {
      try {
        await this.processRule(guild, rule);
      } catch (err) {
        logger.error(`[AutoPromotion] Error processing rule ${rule._id}:`, err);
      }
    }
  }

  async processRule(guild, rule) {
    const eligibleStaff = await this.findEligibleStaff(guild.id, rule);
    
    for (const staffMember of eligibleStaff) {
      try {
        await this.processPromotion(guild, staffMember, rule);
      } catch (err) {
        logger.error(`[AutoPromotion] Error processing promotion for ${staffMember.userId}:`, err);
      }
    }
  }

  async findEligibleStaff(guildId, rule) {
    const eligible = [];
    
    const staffStats = await UserStats.find({
      guildId,
      'staff.rank': rule.fromRank
    }).lean();

    for (const stats of staffStats) {
      const meetsRequirements = await this.checkRequirements(stats, rule.requirements);
      
      if (meetsRequirements) {
        const pendingPromotion = await Promotion.findOne({
          guildId,
          userId: stats.userId,
          toRank: rule.toRank,
          approved: null
        });
        
        if (!pendingPromotion) {
          eligible.push(stats);
        }
      }
    }
    
    return eligible;
  }

  async checkRequirements(stats, requirements) {
    if (stats.staff.points < requirements.minPoints) return false;
    if (stats.staff.shifts < requirements.minShifts) return false;
    if (stats.staff.shiftMinutes < (requirements.minShiftHours * 60)) return false;
    if (stats.staff.consistency < requirements.minConsistency) return false;
    if (stats.staff.warnings > requirements.maxWarnings) return false;
    if (stats.staff.reputation < requirements.minReputation) return false;
    
    if (requirements.minDaysInRank > 0 && stats.staff.lastPromotionAt) {
      const daysSincePromotion = (Date.now() - stats.staff.lastPromotionAt.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSincePromotion < requirements.minDaysInRank) return false;
    }
    
    if (requirements.achievements?.length > 0) {
      const hasAllAchievements = requirements.achievements.every(ach => 
        stats.staff.achievements.includes(ach)
      );
      if (!hasAllAchievements) return false;
    }
    
    return true;
  }

  async processPromotion(guild, stats, rule) {
    const promotion = new Promotion({
      guildId: guild.id,
      userId: stats.userId,
      fromRank: rule.fromRank,
      toRank: rule.toRank,
      promotionType: rule.actions.requireApproval ? 'review' : 'automatic',
      criteria: {
        points: stats.staff.points,
        shifts: stats.staff.shifts,
        consistency: stats.staff.consistency,
        warnings: stats.staff.warnings,
        daysInServer: Math.floor((Date.now() - (stats.createdAt?.getTime() || Date.now())) / (1000 * 60 * 60 * 24))
 },
      approved: rule.actions.requireApproval ? null : true
    });

    await promotion.save();

    if (rule.actions.requireApproval) {
      await this.sendApprovalRequest(guild, promotion, rule);
    } else {
      await this.executePromotion(guild, promotion, rule);
    }
  }

  async sendApprovalRequest(guild, promotion, rule) {
    const guildData = await Guild.findOne({ guildId: guild.id }).lean();
    const reviewChannelId = guildData?.settings?.modChannel || guildData?.channels?.modLogs;
    
    if (!reviewChannelId) {
      logger.warn(`[AutoPromotion] No review channel configured for guild ${guild.id}`);
      return;
    }

    const channel = guild.channels.cache.get(reviewChannelId);
    if (!channel) return;

    const user = await this.client.users.fetch(promotion.userId).catch(() => null);
    
    const embed = new EmbedBuilder()
      .setColor('#FFD700')
      .setTitle('⬆️ Promotion Request')
      .setDescription(`**${user?.tag || 'Unknown User'}** is eligible for promotion to **${promotion.toRank}**`)
      .addFields(
        { name: 'Current Rank', value: promotion.fromRank, inline: true },
        { name: 'Proposed Rank', value: promotion.toRank, inline: true },
        { name: 'Points', value: `${promotion.criteria.points}`, inline: true },
        { name: 'Shifts', value: `${promotion.criteria.shifts}`, inline: true },
        { name: 'Consistency', value: `${promotion.criteria.consistency}%`, inline: true },
        { name: 'Warnings', value: `${promotion.criteria.warnings}`, inline: true }
      )
      .setTimestamp();

    const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
    
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`promo_approve_${promotion._id}`)
        .setLabel('✅ Approve')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`promo_deny_${promotion._id}`)
        .setLabel('❌ Deny')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`promo_view_${promotion._id}`)
        .setLabel('📊 View Profile')
        .setStyle(ButtonStyle.Secondary)
    );

    const message = await channel.send({ embeds: [embed], components: [row] });
    
    promotion.reviewMessageId = message.id;
    promotion.reviewChannelId = channel.id;
    await promotion.save();
  }

  async executePromotion(guild, promotion, rule) {
    const guildData = await Guild.findOne({ guildId: guild.id }).lean();
    
    const rankRoles = guildData?.rankRoles || {};
    const newRoleId = rankRoles[promotion.toRank];
    const oldRoleId = rankRoles[promotion.fromRank];

    const member = await guild.members.fetch(promotion.userId).catch(() => null);
    if (!member) {
      logger.warn(`[AutoPromotion] Member ${promotion.userId} not found in guild ${guild.id}`);
      return;
    }

    try {
      if (rule.actions.grantRole && newRoleId) {
        await member.roles.add(newRoleId);
      }
      
      if (rule.actions.removeOldRole && oldRoleId) {
        await member.roles.remove(oldRoleId);
      }

      await UserStats.findOneAndUpdate(
        { userId: promotion.userId, guildId: guild.id },
        {
          $set: {
            'staff.rank': promotion.toRank,
            'staff.lastPromotionAt': new Date()
          }
        }
      );

      await User.findOneAndUpdate(
        { userId: promotion.userId, 'guilds.guildId': guild.id },
        {
          $set: {
            'guilds.$.staff.rank': promotion.toRank,
            'guilds.$.staff.lastPromotionDate': new Date()
          }
        }
      );

      promotion.executedAt = new Date();
      await promotion.save();

      if (rule.actions.announcePromotion) {
        await this.announcePromotion(guild, promotion, member);
      }

      if (rule.actions.dmUser) {
        await this.dmUserPromotion(member, promotion);
      }

      logger.info(`[AutoPromotion] Executed promotion for ${promotion.userId}: ${promotion.fromRank} -> ${promotion.toRank}`);
    } catch (err) {
      logger.error(`[AutoPromotion] Error executing promotion:`, err);
    }
  }

  async announcePromotion(guild, promotion, member) {
    const guildData = await Guild.findOne({ guildId: guild.id }).lean();
    const channelId = guildData?.settings?.promotionChannel;
    
    if (!channelId) return;

    const channel = guild.channels.cache.get(channelId);
    if (!channel) return;

    const embed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('⬆️ Staff Promotion')
      .setDescription(`Congratulations to **${member.user.tag}** for being promoted to **${promotion.toRank}**!`)
      .addFields(
        { name: 'Previous Rank', value: promotion.fromRank, inline: true },
        { name: 'New Rank', value: promotion.toRank, inline: true },
        { name: 'Points Earned', value: `${promotion.criteria.points}`, inline: true }
      )
      .setThumbnail(member.user.displayAvatarURL())
      .setTimestamp();

    await channel.send({ embeds: [embed] });
  }

  async dmUserPromotion(member, promotion) {
    try {
      const embed = new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle('⬆️ Congratulations on Your Promotion!')
        .setDescription(`You have been promoted to **${promotion.toRank}**!`)
        .addFields(
          { name: 'Previous Rank', value: promotion.fromRank, inline: true },
          { name: 'New Rank', value: promotion.toRank, inline: true },
          { name: 'Points', value: `${promotion.criteria.points}`, inline: true }
        )
        .setTimestamp();

      await member.send({ embeds: [embed] });
    } catch (err) {
      logger.warn(`[AutoPromotion] Could not DM user ${promotion.userId}:`, err.message);
    }
  }

  async handlePromotionButton(interaction) {
    const customId = interaction.customId;
    const promotionId = customId.split('_')[2];
    const action = customId.split('_')[1];

    const promotion = await Promotion.findById(promotionId);
    if (!promotion) {
      return interaction.reply({ content: '❌ Promotion request not found.', ephemeral: true });
    }

    if (action === 'view') {
      return this.handleViewProfile(interaction, promotion);
    }

    const rule = await AutoPromotionRule.findOne({
      guildId: promotion.guildId,
      fromRank: promotion.fromRank,
      toRank: promotion.toRank
    });

    if (action === 'approve') {
      promotion.approved = true;
      promotion.approvedBy = interaction.user.id;
      promotion.approvedAt = new Date();
      await promotion.save();

      const guild = this.client.guilds.cache.get(promotion.guildId);
      if (guild && rule) {
        await this.executePromotion(guild, promotion, rule);
      }

      await interaction.update({
        content: `✅ Promotion approved by ${interaction.user.tag}`,
        components: []
      });
    } else if (action === 'deny') {
      const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
      
      const modal = new ModalBuilder()
        .setCustomId(`deny_promo_${promotionId}`)
        .setTitle('Deny Promotion');

      const reasonInput = new TextInputBuilder()
        .setCustomId('denial_reason')
        .setLabel('Reason for denial')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
      await interaction.showModal(modal);
    }
  }

  async handleViewProfile(interaction, promotion) {
    const stats = await UserStats.findOne({
      userId: promotion.userId,
      guildId: promotion.guildId
    }).lean();

    const user = await this.client.users.fetch(promotion.userId).catch(() => null);
    
    const embed = new EmbedBuilder()
      .setColor('#0099FF')
      .setTitle(`👤 ${user?.tag || 'Unknown User'} - Staff Profile`)
      .addFields(
        { name: 'Current Rank', value: stats?.staff?.rank || 'Unknown', inline: true },
        { name: 'Points', value: `${stats?.staff?.points || 0}`, inline: true },
        { name: 'Shifts', value: `${stats?.staff?.shifts || 0}`, inline: true },
        { name: 'Consistency', value: `${stats?.staff?.consistency || 0}%`, inline: true },
        { name: 'Warnings', value: `${stats?.staff?.warnings || 0}`, inline: true },
        { name: 'Reputation', value: `${stats?.staff?.reputation || 0}`, inline: true }
      )
      .setThumbnail(user?.displayAvatarURL() || null);

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }

  async createRule(guildId, ruleData) {
    const rule = new AutoPromotionRule({
      guildId,
      ...ruleData
    });
    
    await rule.save();
    logger.info(`[AutoPromotion] Created rule for guild ${guildId}: ${rule.name}`);
    return rule;
  }

  async updateRule(ruleId, updateData) {
    const rule = await AutoPromotionRule.findByIdAndUpdate(
      ruleId,
      { $set: { ...updateData, updatedAt: new Date() } },
      { new: true }
    );
    
    logger.info(`[AutoPromotion] Updated rule ${ruleId}`);
    return rule;
  }

  async deleteRule(ruleId) {
    await AutoPromotionRule.findByIdAndDelete(ruleId);
    logger.info(`[AutoPromotion] Deleted rule ${ruleId}`);
  }

  async getRules(guildId) {
    return await AutoPromotionRule.find({ guildId }).sort({ priority: -1 }).lean();
  }
}

module.exports = AutoPromotionSystem;
