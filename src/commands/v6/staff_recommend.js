const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { validatePremiumLicense } = require('../../utils/enhancedPremiumGuard');
const { createEnterpriseEmbed } = require('../../utils/enhancedEmbeds');
const { validatePremiumLicense } = require('../../utils/premium_guard');
const { User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('staff_recommend')
    .setDescription('Get a staff recommendation for a task or role')
    .addStringOption(opt =>
      opt.setName('task').setDescription('Task type (e.g. moderation, support, events)').setRequired(false)),

  async execute(interaction, client) {
    await interaction.deferReply();

            const license = await validatePremiumLicense(interaction, 'enterprise');
            if (!license.allowed) {
                return await interaction.editReply({ embeds: [license.embed], components: [license.components] });
            }
    const taskType = interaction.options.getString('task') || 'general';

    const users = await User.find({ 'staff.points': { $gt: 0 } })
      .sort({ 'staff.points': -1, 'staff.consistency': -1 })
      .limit(10)
      .lean();

    if (!users.length) {
      return interaction.editReply('?? No staff data found yet.');
    }

    // Score based on rank, points, consistency, reputation
    const rankWeights = { owner: 10, admin: 8, manager: 6, senior: 4, staff: 2, trial: 1, member: 0 };
    const scored = users.map(u => ({
      ...u,
      totalScore: (rankWeights[u.staff?.rank] || 0) * 10 +
        (u.staff?.points || 0) * 0.3 +
        (u.staff?.consistency || 100) * 0.2 +
        (u.staff?.reputation || 0) * 0.5
    })).sort((a, b) => b.totalScore - a.totalScore);

    const top3 = scored.slice(0, 3);
    const medals = ['??', '??', '??'];

    const fields = top3.map((u, i) => ({
      name: `${medals[i]} ${u.username || 'Unknown'} � ${u.staff?.rank || 'member'}`,
      value: `Points: **${u.staff?.points || 0}** | Consistency: **${u.staff?.consistency || 100}%** | Rep: **${u.staff?.reputation || 0}**`,
      inline: false
    }));

    const embed = createEnterpriseEmbed()
      .setTitle(`?? Staff Recommendations � ${taskType.charAt(0).toUpperCase() + taskType.slice(1)}`)
      
      .setDescription('Best staff picks based on rank, points, consistency, and reputation:')
      .addFields(fields)
      
      ;

    const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_ent_staff_recommend').setLabel('�� Sync Enterprise Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [embed], components: [row] });
  }
};





