const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/enhancedEmbeds');
const { User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reset_points')
    .setDescription('[Premium] Reset ALL staff points for the active server')
    .addBooleanOption(opt => opt.setName('confirm').setDescription('You must confirm this destructive action').setRequired(true)),

  async execute(interaction) {
    try {
      if (!interaction.member.permissions.has('Administrator')) {
        return interaction.editReply({ content: '? Administrator permission is strictly required.', ephemeral: true });
      }

      const confirm = interaction.options.getBoolean('confirm');

      if (!confirm) {
        return interaction.editReply({ content: '? Operation aborted. You must use `/reset_points confirm:True` to execute this.', ephemeral: true });
      }

      await interaction.deferReply();

      // STRICT SCOPING: Only reset users matching THIS guild
      const result = await User.updateMany(
        { guildId: interaction.guildId, 'staff.points': { $gt: 0 } },
        { $set: { 'staff.points': 0 } }
      );

      const embed = await createCustomEmbed(interaction, {
        title: '?? Enterprise Economy Wipeout',
        description: `**PROTOCOL EXECUTED:** The local staff economy for **${interaction.guild.name}** has been completely synchronized to zero state.`,
        fields: [
          { name: '?? Operational Impact', value: `\`${result.modifiedCount}\` Personnel Records Sanitized`, inline: true },
          { name: '?? Action Type', value: 'Full Economy Reset', inline: true }
        ],
        footer: `System Wipe Activated By: ${interaction.user.tag}`,
        color: 'error'
      });

      const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_btn_resetPoints').setLabel('🔄 Sync Live Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [embed], components: [row] });

    } catch (error) {
      console.error('Reset Points Error:', error);
      const errEmbed = createErrorEmbed('An error occurred while attempting to wipe server points.');
            if (interaction.deferred || interaction.replied) {
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_btn_resetPoints').setLabel('🔄 Sync Live Data').setStyle(ButtonStyle.Secondary));
            return await interaction.editReply({ embeds: [errEmbed], components: [row] });
      } else {
        await interaction.editReply({ embeds: [errEmbed], ephemeral: true });
      }
    }
  }
};


