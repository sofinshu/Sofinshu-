const { ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');
const { createCoolEmbed, createCustomEmbed, createErrorEmbed } = require('../../utils/enhancedEmbeds');
const { User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('check_points')
    .setDescription('Check your or another staff member\'s points')
    .addUserOption(opt => opt.setName('user').setDescription('Staff member to check').setRequired(false)),

  async execute(interaction) {
    try {
      await interaction.deferReply();
      const targetUser = interaction.options.getUser('user') || interaction.user;
      const userData = await User.findOne({ userId: targetUser.id, 'guilds.guildId': interaction.guildId }).lean();

      const staffSync = userData.guilds?.find(g => g.guildId === interaction.guildId)?.staff || {};
      const points = staffSync.points || 0;
      const rank = staffSync.rank || 'trial';
      const consistency = staffSync.consistency || 100;

      const embed = await createCustomEmbed(interaction, {
        title: `💰 Personnel Asset Profile: ${targetUser.username}`,
        thumbnail: targetUser.displayAvatarURL({ dynamic: true }),
        fields: [
          { name: '💎 Operational Points', value: `\`${points}\``, inline: true },
          { name: '🎖️ Assigned Rank', value: `\`${rank.toUpperCase()}\``, inline: true },
          { name: '📊 Performance Consistency', value: `\`${consistency}%\``, inline: true }
        ],
        color: 'info'
      });

      const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_v1_checkPoints').setLabel('🔄 Sync Live Data').setStyle(ButtonStyle.Secondary));
      await interaction.editReply({ embeds: [embed], components: [row] });
    } catch (error) {
      console.error(error);
      const errEmbed = createErrorEmbed('An error occurred while checking points.');
      if (interaction.deferred || interaction.replied) {
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_v1_checkPoints').setLabel('🔄 Sync Live Data').setStyle(ButtonStyle.Secondary));
        return await interaction.editReply({ embeds: [errEmbed], components: [row] });
      } else {
        await interaction.editReply({ embeds: [errEmbed], ephemeral: true });
      }
    }
  }
};


