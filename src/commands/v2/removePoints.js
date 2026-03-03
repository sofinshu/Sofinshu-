const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');
const { User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('remove_points')
    .setDescription('[Premium] Remove points from a user within this server')
    .addUserOption(opt => opt.setName('user').setDescription('User').setRequired(true))
    .addIntegerOption(opt => opt.setName('amount').setDescription('Amount to remove').setRequired(true))
    .addStringOption(opt => opt.setName('reason').setDescription('Reason').setRequired(false)),

  async execute(interaction, client) {
    try {
      await interaction.deferReply();
      const targetUser = interaction.options.getUser('user');
      const amount = interaction.options.getInteger('amount');
      const reason = interaction.options.getString('reason') || 'No reason provided';

      if (!interaction.member.permissions.has('ModerateMembers') && !interaction.member.permissions.has('ManageGuild')) {
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_btn_removePoints').setLabel('� Sync Live Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [createErrorEmbed('You do not have permission to remove points.')], components: [row] });
      }

      // STRICT SCOPING: Only find user data connected to this specific guild
      let user = await User.findOne({ userId: targetUser.id, guildId: interaction.guildId });

      if (!user) {
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_btn_removePoints').setLabel('� Sync Live Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [createErrorEmbed(`No staff record found for <@${targetUser.id}> in this server.`)], components: [row] });
      }

      if (!user.staff) user.staff = { points: 0 };
      user.staff.points = Math.max(0, (user.staff.points || 0) - amount);
      await user.save();

      const embed = await createCustomEmbed(interaction, {
        title: '?? Administrative Point Deduction',
        description: `Personnel record updated for **${targetUser.tag}**. Points have been successfully extracted from the local server profile.`,
        thumbnail: targetUser.displayAvatarURL({ dynamic: true }),
        fields: [
          { name: '?? Targeted Personnel', value: `<@${targetUser.id}>`, inline: true },
          { name: '? Points Extracted', value: `\`-${amount.toLocaleString()}\` **PTS**`, inline: true },
          { name: '?? Protocol/Reason', value: `*${reason}*`, inline: false }
        ],
        footer: `Authorization: ${interaction.user.tag}`,
        color: 'error'
      });

      const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_btn_removePoints').setLabel('� Sync Live Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [embed], components: [row] });

    } catch (error) {
      console.error('Remove Points Error:', error);
      const errEmbed = createErrorEmbed('An error occurred while removing user points.');
      if (interaction.deferred || interaction.replied) {
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_btn_removePoints').setLabel('� Sync Live Data').setStyle(ButtonStyle.Secondary));
            await return await interaction.editReply({ embeds: [errEmbed], components: [row] });
      } else {
        await interaction.editReply({ embeds: [errEmbed], ephemeral: true });
      }
    }
  }
};


