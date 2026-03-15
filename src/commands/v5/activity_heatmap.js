const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { validatePremiumLicense } = require('../../utils/enhancedPremiumGuard');
const { createCustomEmbed, createErrorEmbed, createPremiumEmbed, createSuccessEmbed } = require('../../utils/enhancedEmbeds');
const { Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('activity_heatmap')
    .setDescription('Visual Spectral Activity Mapping tool')
    .addIntegerOption(opt => opt.setName('days').setDescription('Number of days (default 14)').setRequired(false)),

  async execute(interaction) {
    try {
      await interaction.deferReply();

            const license = await validatePremiumLicense(interaction, 'premium');
            if (!license.allowed) {
                return await interaction.editReply({ embeds: [license.embed], components: [license.components] });
            }
      const guildId = interaction.guildId;
      const days = Math.min(interaction.options.getInteger('days') || 14, 30);
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const activities = await Activity.find({ guildId, createdAt: { $gte: startDate } }).lean();

      const heatmap = {};
      for (let i = 0; i < days; i++) {
        const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        const key = date.toISOString().split('T')[0];
        heatmap[key] = 0;
      }

      activities.forEach(a => {
        const key = a.createdAt.toISOString().split('T')[0];
        if (heatmap[key] !== undefined) heatmap[key]++;
      });

      const sorted = Object.entries(heatmap).sort((a, b) => b[0].localeCompare(a[0]));
      const maxVal = Math.max(...Object.values(heatmap), 1);
      const total = activities.length;
      const avgPerDay = (total / days).toFixed(1);

      const chart = sorted.map(([date, count]) => {
        const intensity = Math.min(10, Math.floor((count / maxVal) * 10));
        const bars = '█'.repeat(intensity) + '█'.repeat(10 - intensity);
        const dayLabel = new Date(date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
        return `\`${dayLabel}\` ${bars} **${count}**`;
      }).join('\n');

      const embed = await createCustomEmbed(interaction, {
        title: '?? Spectral Activity Mapping',
        thumbnail: interaction.guild.iconURL({ dynamic: true }),
        description: `### ??? Macroscopic Density Visualization\nVisualizing 14-day trailing engagement density for sector **${interaction.guild.name}**. Analyzing metabolic signal fluctuations.`,
        fields: [
          { name: '?? Operational Heatmap', value: chart || '*No signals detected in the active vector.*', inline: false },
          { name: '?? Total Density', value: `\`${total}\` Signals`, inline: true },
          { name: '?? Mean Frequency', value: `\`${avgPerDay}\` / Day`, inline: true },
          { name: '?? Capture Vector', value: `\`${days} Days\``, inline: true }
        ],
        footer: 'Metabolic Activity Visualization • V5 Executive Suite',
        color: 'premium'
      });

      const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_v5_activity_heatmap').setLabel('🔄 Sync Live Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [embed], components: [row] });

    } catch (error) {
      console.error('Heatmap Error:', error);
      const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_v5_activity_heatmap').setLabel('🔄 Sync Live Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [createErrorEmbed('Heatmap Intelligence failure: Unable to plot spectral density matrices.')], components: [row] });
    }
  }
};


