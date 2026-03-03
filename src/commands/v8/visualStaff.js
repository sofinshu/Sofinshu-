const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createZenithEmbed, createSuccessEmbed, createErrorEmbed } = require('../../utils/embeds');
const { createEnterpriseEmbed } = require('../../utils/embeds');
const { User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('visual_staff')
    .setDescription('[Visual] Visual staff leaderboard'),

  async execute(interaction, client) {
    await interaction.deferReply();

    const users = await User.find({ 'staff.points': { $gt: 0 } })
      .sort({ 'staff.points': -1 })
      .limit(10)
      .lean();

    if (!users.length) {
      return interaction.editReply('? No staff found.');
    }

    const maxPoints = users[0]?.staff?.points || 1;
    const medals = ['??', '??', '??'];

    const chart = users.map((u, i) => {
      const pts = u.staff?.points || 0;
      const bar = '¦'.repeat(Math.round((pts / maxPoints) * 10)).padEnd(10, '¦');
      const medal = medals[i] || `\`${i + 1}.\``;
      return `${medal} ${u.username || '?'}: ${bar} ${pts}`;
    }).join('\n');

    const embed = createEnterpriseEmbed()
      .setTitle('?? Visual Leaderboard')
      .setDescription(`\`\`\`${chart}\`\`\``)
      
      
      ;

    await const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_zen_visualStaff').setLabel('ðŸ„ Refresh Hyper-Apex Metrics').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [embed], components: [row] });
  }
};




