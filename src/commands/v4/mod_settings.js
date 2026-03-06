const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { validatePremiumLicense } = require('../../utils/enhancedPremiumGuard');
const { createPremiumEmbed } = require('../../utils/enhancedEmbeds');
const { Guild } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mod_settings')
    .setDescription('Configure moderation settings')
    .addBooleanOption(option =>
      option.setName('enabled')
        .setDescription('Enable moderation')
        .setRequired(true)),

  async execute(interaction) {
    const enabled = interaction.options.getBoolean('enabled');
    const guildId = interaction.guildId;

    let guild = await Guild.findOne({ guildId });
    if (!guild) {
      guild = new Guild({ guildId, name: interaction.guild.name });
    }

    if (!guild.settings) guild.settings = {};
    if (!guild.settings.modules) guild.settings.modules = {};
    guild.settings.modules.moderation = enabled;
    await guild.save();

    const embed = createPremiumEmbed()
      .setTitle('?? Moderation Settings')
      
      .setDescription(`Moderation is now ${enabled ? 'enabled' : 'disabled'}`);

    const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_v4_mod_settings').setLabel('� Sync Live Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [embed], components: [row] });
  }
};





