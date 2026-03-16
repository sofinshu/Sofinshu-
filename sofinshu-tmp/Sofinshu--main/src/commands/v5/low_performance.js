const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { validatePremiumLicense } = require('../../utils/enhancedPremiumGuard');
const { createPremiumEmbed } = require('../../utils/enhancedEmbeds');
const { User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('low_performance')
    .setDescription('View low performance staff')
    .addIntegerOption(opt => opt.setName('limit').setDescription('Number of users to show').setRequired(false)),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const limit = interaction.options.getInteger('limit') || 10;

    const users = await User.find({
      'guilds.guildId': guildId,
      'staff.points': { $exists: true, $gt: 0 }
    })
      .sort({ 'staff.points': 1 })
      .limit(limit)
      .lean();

    if (users.length === 0) {
      await interaction.editReply({ content: 'No staff data found.' });
      return;
    }

    const embed = createPremiumEmbed()
      .setTitle('?? Low Performance Staff')
      
      .setDescription(
        users.map((u, i) => {
          const guildData = u.guilds?.find(g => g.guildId === guildId);
          const name = guildData?.nickname || u.username || `User ${u.userId}`;
          return `${i + 1}. ${name} - ${u.staff?.points || 0} points`;
        }).join('\n')
      )
      ;

    const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_v5_low_performance').setLabel('🔄 Sync Live Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [embed], components: [row] });
  }
};





