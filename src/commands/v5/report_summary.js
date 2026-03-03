const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createPremiumEmbed } = require('../../utils/embeds');
const { validatePremiumLicense } = require('../../utils/premium_guard');
const { Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('report_summary')
    .setDescription('View report summary')
    .addIntegerOption(opt => opt.setName('days').setDescription('Number of days').setRequired(false)),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const days = interaction.options.getInteger('days') || 30;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const activities = await Activity.find({ guildId, createdAt: { $gte: startDate } });

    const typeCounts = {};
    activities.forEach(a => {
      typeCounts[a.type] = (typeCounts[a.type] || 0) + 1;
    });

    const userActivity = {};
    activities.forEach(a => {
      userActivity[a.userId] = (userActivity[a.userId] || 0) + 1;
    });

    const topUsers = Object.entries(userActivity)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const embed = createPremiumEmbed()
      .setTitle('?? Report Summary')
      
      .addFields(
        { name: 'Total Activities', value: activities.length.toString(), inline: true },
        { name: 'Messages', value: (typeCounts.message || 0).toString(), inline: true },
        { name: 'Commands', value: (typeCounts.command || 0).toString(), inline: true },
        { name: 'Shifts', value: (typeCounts.shift || 0).toString(), inline: true },
        { name: 'Warnings', value: (typeCounts.warning || 0).toString(), inline: true },
        { name: 'Period', value: `${days} days`, inline: true }
      )
      .setDescription(`Top 5 Active Users:\n${topUsers.map(([uid, count], i) => `${i + 1}. <@${uid}>: ${count}`).join('\n')}`)
      ;

    const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_v5_report_summary').setLabel('� Sync Live Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [embed], components: [row] });
  }
};





