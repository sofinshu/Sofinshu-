const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { validatePremiumLicense } = require('../../utils/enhancedPremiumGuard');
const { createCustomEmbed, createErrorEmbed, createPremiumEmbed, createSuccessEmbed } = require('../../utils/enhancedEmbeds');
const { Activity, User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('promotion_history')
    .setDescription('Poll chronologically authenticated execution histories governing server ranks.')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('Filter logs resolving explicitly against a single operator')
        .setRequired(false)),

  async execute(interaction) {
    try {
      await interaction.deferReply();

      const license = await validatePremiumLicense(interaction, 'premium');
      if (!license.allowed) {
        return await interaction.editReply({ embeds: [license.embed], components: [license.components] });
      }
      const guildId = interaction.guildId;
      const targetUser = interaction.options.getUser('user');

      const query = { guildId, type: 'promotion' };
      if (targetUser) query.userId = targetUser.id;

      const promotions = await Activity.find(query)
        .sort({ createdAt: -1 })
        .limit(20)
        .lean();

      // Bind strictly
      const allUsers = await User.find({
        guildId,
        'staff.rank': { $exists: true, $ne: 'member' }
      }).lean();

      if (promotions.length === 0 && allUsers.length === 0) {
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_v3_promotion_history').setLabel('Sync Live Data').setStyle(ButtonStyle.Secondary));
        if (targetUser) {
          return await interaction.editReply({ embeds: [createErrorEmbed(`No hierarchical footprints exist tracking <@${targetUser.id}>.`)], components: [row] });
        }
        return await interaction.editReply({ embeds: [createErrorEmbed('No automated promotions or manual boundary modifications have deployed on this server.')], components: [row] });
      }

      const embedPayload = {
        title: 'Network Hierarchy Ledgers',
        description: targetUser
          ? `Filtering footprint sequences explicitly mapped to <@${targetUser.id}> in **${interaction.guild.name}**.`
          : `Reviewing the top ${Math.min(20, promotions.length)} rank executions logged inside **${interaction.guild.name}**.`,
        thumbnail: targetUser ? targetUser.displayAvatarURL() : interaction.guild.iconURL(),
        fields: []
      };

      const promotedUsers = [...new Set(promotions.map(p => p.userId))];
      embedPayload.fields.push(
        { name: 'Global Operations', value: `\`${promotions.length}\` Sequences`, inline: true },
        { name: 'Target Subjects', value: `\`${promotedUsers.length}\` Operators`, inline: true }
      );

      if (promotions.length > 0) {
        const promoList = await Promise.all(promotions.slice(0, 10).map(async promo => {
          const fromRank = promo.data?.fromRank || 'member';
          const toRank = promo.data?.toRank || 'undefined';
          const unixTime = Math.floor(new Date(promo.createdAt).getTime() / 1000);

          return `> **<@${promo.userId}>:** \`${fromRank.toUpperCase()}\` -> \`${toRank.toUpperCase()}\` (<t:${unixTime}:d>)`;
        }));

        embedPayload.fields.push({ name: 'Recent Trailing Matrix', value: promoList.join('\n'), inline: false });
      }

      const rankCounts = {};
      allUsers.forEach(u => {
        const rank = u.staff?.rank || 'member';
        rankCounts[rank] = (rankCounts[rank] || 0) + 1;
      });

      const rankSummary = Object.entries(rankCounts)
        .map(([rank, count]) => `\`${rank.toUpperCase()}: ${count}\``)
        .join(', ');

      if (rankSummary && !targetUser) {
        embedPayload.fields.push({ name: 'Cumulative Network Bounds', value: rankSummary, inline: false });
      }

      const embed = await createCustomEmbed(interaction, embedPayload);
      const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_v3_promotion_history').setLabel('Sync Live Data').setStyle(ButtonStyle.Secondary));
      await interaction.editReply({ embeds: [embed], components: [row] });

    } catch (error) {
      console.error('Promotion History Error:', error);
      const errEmbed = createErrorEmbed('A database tracking error occurred generating trailing propagation ranks.');
      const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_v3_promotion_history').setLabel('Sync Live Data').setStyle(ButtonStyle.Secondary));
      if (interaction.deferred || interaction.replied) {
        return await interaction.editReply({ embeds: [errEmbed], components: [row] });
      } else {
        await interaction.editReply({ embeds: [errEmbed], ephemeral: true });
      }
    }
  }
};
