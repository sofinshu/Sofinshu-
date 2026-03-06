const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { validatePremiumLicense } = require('../../utils/enhancedPremiumGuard');
const { createCustomEmbed, createErrorEmbed, createPremiumEmbed, createSuccessEmbed } = require('../../utils/enhancedEmbeds');
const { User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('achievement_tracker')
    .setDescription('Track and view custom staff achievements securely mapped to this server')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to check achievements for')
        .setRequired(false)),

  async execute(interaction) {
    try {
      await interaction.deferReply();

      const license = await validatePremiumLicense(interaction, 'premium');
      if (!license.allowed) {
        return await interaction.editReply({ embeds: [license.embed], components: [license.components] });
      }
      const targetUser = interaction.options.getUser('user') || interaction.user;
      const guildId = interaction.guildId;

      const guildData = await Guild.findOne({ guildId }).select('achievements premium').lean();
      const user = await User.findOne({ userId: targetUser.id }).lean();
      const guildProfile = user?.guilds?.find(g => g.guildId === guildId);

      if (!guildProfile || !guildProfile.staff) {
        return await interaction.editReply({
          embeds: [createErrorEmbed(`No staff record exists for <@${targetUser.id}> in this server. Only registered staff can track achievements.`)]
        });
      }

      const guildAchievements = guildData?.achievements || [];
      const userUnlockedIds = guildProfile.staff.achievements || [];

      const unlockedCount = userUnlockedIds.length;
      const totalCount = guildAchievements.length || 1; // Avoid div by zero
      const progress = Math.round((unlockedCount / totalCount) * 100);
      const filled = Math.floor(progress / 10);
      const progressBar = `\`${'▰'.repeat(filled)}${'▱'.repeat(10 - filled)}\` **${progress}%**`;

      const unlockedLines = guildAchievements
        .filter(a => userUnlockedIds.includes(a.id))
        .map(a => `${a.icon || '🏅'} **${a.name}** - *${a.description || 'Achievement unlocked'}*`);

      const lockedLines = guildAchievements
        .filter(a => !userUnlockedIds.includes(a.id))
        .map(a => `🔒 **${a.name}** - *Criteria: ${a.criteria?.value} ${a.criteria?.type}*`);

      const embed = await createCustomEmbed(interaction, {
        title: `🏆 Personnel Achievement Matrix: ${targetUser.username}`,
        thumbnail: targetUser.displayAvatarURL({ dynamic: true }),
        description: `### 📂 Strategic Milestone Registry\nReviewing milestones authenticated within **${interaction.guild.name}**.`,
        fields: [
          { name: '📈 Operational Progress', value: progressBar, inline: false },
          { name: '🛡️ Current Rank', value: `\`${(guildProfile.staff.rank || 'trial').toUpperCase()}\``, inline: true },
          { name: '✨ Staff Points', value: `\`${(guildProfile.staff.points || 0).toLocaleString()}\``, inline: true },
          { name: '✅ Unlocked Milestones', value: unlockedLines.join('\n') || '*No authenticated milestones detected.*', inline: false }
        ],
        footer: 'Continuous operational execution required for high-tier unlocks. • V3 Strategic',
        color: 'premium'
      });

      if (lockedLines.length > 0) {
        embed.addFields({ name: '🔐 Upcoming Objectives', value: lockedLines.slice(0, 5).join('\n') + (lockedLines.length > 5 ? `\n*...and ${lockedLines.length - 5} more*` : ''), inline: false });
      }

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Achievement Tracker Error:', error);
      const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_v3_achievement_tracker').setLabel('⚙ Sync Live Data').setStyle(ButtonStyle.Secondary));
      await interaction.editReply({ embeds: [createErrorEmbed('Milestone Registry failure: Unable to decode personnel achievement arrays.')], components: [row] });
    }
  }
};


