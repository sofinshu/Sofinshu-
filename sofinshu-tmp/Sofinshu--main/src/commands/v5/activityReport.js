const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { validatePremiumLicense } = require('../../utils/enhancedPremiumGuard');
const { createPremiumEmbed } = require('../../utils/enhancedEmbeds');
const { User, Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('activity_report')
    .setDescription('[Analytics] Generate activity report'),

  async execute(interaction, client) {
    await interaction.deferReply();

            const license = await validatePremiumLicense(interaction, 'premium');
            if (!license.allowed) {
                return await interaction.editReply({ embeds: [license.embed], components: [license.components] });
            }

    const activities = await Activity.find({ guildId: interaction.guildId })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    const typeCount = {};
    activities.forEach(a => {
      typeCount[a.type] = (typeCount[a.type] || 0) + 1;
    });

    const list = Object.entries(typeCount)
      .map(([type, count]) => `**${type}**: ${count}`)
      .join('\n');

    const embed = createPremiumEmbed()
      .setTitle('?? Activity Report')
      .setDescription(list || 'No activity data')
      
      ;

    const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_v5_activityReport').setLabel('🔄 Sync Live Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [embed], components: [row] });
  }
};





