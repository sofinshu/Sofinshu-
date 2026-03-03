const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createCoolEmbed, createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('shift_start')
    .setDescription('Start your work shift'),

  async execute(interaction, client) {
    try {
      await interaction.deferReply({ ephemeral: true });
      const staffSystem = client.systems.staff;
      const userId = interaction.user.id;
      const guildId = interaction.guildId;

      if (!staffSystem) {
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_v1_shift_start').setLabel('  Sync Live Data').setStyle(ButtonStyle.Secondary));
        return await interaction.editReply({ embeds: [createErrorEmbed('Staff system is currently offline.')], components: [row] });
      }

      const existingShift = await require('../../database/mongo').Shift.findOne({
        userId,
        guildId,
        endTime: null
      });

      if (existingShift) {
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_v1_shift_start').setLabel('  Sync Live Data').setStyle(ButtonStyle.Secondary));
        return await interaction.editReply({ embeds: [createErrorEmbed('You already have an active shift!')], components: [row] });
      }

      const result = await staffSystem.startShift(userId, guildId);

      const streakText = result.streakDays && result.streakDays > 1
        ? `\n?? **Daily Operational Streak:** \`${result.streakDays} Days\``
        : '';

      const embed = await createCustomEmbed(interaction, {
        title: '? Shift Interface Initialized',
        description: `Your active duty shift has successfully commenced.${streakText}\n\n?? **Timestamp:** <t:${Math.floor(Date.now() / 1000)}:t> (<t:${Math.floor(Date.now() / 1000)}:R>)`,
        fields: [
          { name: 'Shift ID', value: `\`${result.shiftId.toString()}\``, inline: true }
        ],
        color: 'success'
      });

      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`pause_shift_${result.shiftId.toString()}`)
            .setLabel('?? Pause Shift')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId(`end_shift_${result.shiftId.toString()}`)
            .setLabel('?? End Shift')
            .setStyle(ButtonStyle.Danger)
        );

      await interaction.editReply({ embeds: [embed], components: [row] });
    } catch (error) {
      console.error(error);
      const errEmbed = createErrorEmbed('An error occurred while starting your shift.');
            if (interaction.deferred || interaction.replied) {
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_v1_shift_start').setLabel('  Sync Live Data').setStyle(ButtonStyle.Secondary));
        await return await interaction.editReply({ embeds: [errEmbed], components: [row] });
      } else {
        await interaction.editReply({ embeds: [errEmbed], ephemeral: true });
      }
    }
  }
};


