const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createPremiumEmbed } = require('../../utils/enhancedEmbeds');
const { Guild } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('data_insights')
    .setDescription('View data insights'),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const guild = await Guild.findOne({ guildId });

    const embed = createPremiumEmbed()
      .setTitle('?? Data Insights')
      
      .setDescription('Advanced data insights for your server')
      .addFields(
        { name: 'Guild ID', value: guildId, inline: true },
        { name: 'Premium', value: guild?.premium?.isActive ? 'Active' : 'Free', inline: true }
      );

    const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_v5_data_insights').setLabel('🔄 Sync Live Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [embed], components: [row] });
  }
};





