const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { validatePremiumLicense } = require('../../utils/enhancedPremiumGuard');
const { createEnterpriseEmbed, createErrorEmbed, createSuccessEmbed } = require('../../utils/enhancedEmbeds');
const { User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard_summary')
    .setDescription('Quick leaderboard summary of top staff'),

  async execute(interaction, client) {
    await interaction.deferReply();

            const license = await validatePremiumLicense(interaction, 'enterprise');
            if (!license.allowed) {
                return await interaction.editReply({ embeds: [license.embed], components: [license.components] });
            }
    const users = await User.find({ 'staff.points': { $gt: 0 } }).sort({ 'staff.points': -1 }).limit(5).lean();
    if (!users.length) return interaction.editReply('?? No staff data yet.');
    const medals = ['??', '??', '??', '4??', '5??'];
    const list = users.map((u, i) => `${medals[i]} **${u.username || '?'}** � ${u.staff?.points || 0} pts`).join('\n');
    const embed = createEnterpriseEmbed()
      .setTitle('?? Leaderboard Summary')
      
      .setDescription(list)
      
      ;
    const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_ent_leaderboard_summary').setLabel('�� Sync Enterprise Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [embed], components: [row] });
  }
};







