const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { validatePremiumLicense } = require('../../utils/enhancedPremiumGuard');
const { createPremiumEmbed } = require('../../utils/enhancedEmbeds');
const { Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('alert_mod')
    .setDescription('Alert moderators about an issue')
    .addStringOption(option =>
      option.setName('message')
        .setDescription('Alert message')
        .setRequired(true))
    .addUserOption(option =>
      option.setName('user')
        .setDescription('Related user (optional)')
        .setRequired(false)),

  async execute(interaction) {
    const message = interaction.options.getString('message');
    const user = interaction.options.getUser('user');
    const guildId = interaction.guildId;

    await Activity.create({
      guildId,
      userId: user?.id || interaction.user.id,
      type: 'command',
      data: {
        action: 'alert_mod',
        message,
        alertBy: interaction.user.id,
        timestamp: new Date()
      }
    });

    const embed = createPremiumEmbed()
      .setTitle('?? Moderator Alert')
      
      .addFields(
        { name: 'Alerted By', value: interaction.user.tag, inline: true },
        { name: 'Message', value: message, inline: false }
      )
      ;

    if (user) {
      embed.addFields({ name: 'Related User', value: user.tag, inline: true });
    }

    const modChannel = interaction.guild.channels.cache.find(c =>
      c.name.includes('mod') || c.name.includes('alert') || c.name.includes('staff')
    );

    if (modChannel) {
      await modChannel.send({ embeds: [embed] });
      await interaction.editReply({ content: 'Moderators have been alerted!', ephemeral: true });
    } else {
      const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_v4_alert_mod').setLabel('� Sync Live Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [embed], components: [row] });
    }
  }
};





