const { ActionRowBuilder, AttachmentBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const { createCoolEmbed, createCustomEmbed, createErrorEmbed } = require('../../utils/enhancedEmbeds');
const QRCode = require('qrcode');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('invite_link')
    .setDescription('Get the server invite link with a scannable QR code'),

  async execute(interaction) {
    try {
      if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.CreateInstantInvite)) {
        return interaction.editReply({ embeds: [createErrorEmbed('I do not have permission to create invites in this server! Check my roles.')], ephemeral: true });
      }

      await interaction.deferReply();
      const invite = await interaction.channel.createInvite({ maxAge: 86400, maxUses: 100, unique: true });

      // Generate QR Code Buffer
      const qrBuffer = await QRCode.toBuffer(invite.url, {
        color: {
          dark: '#5865F2',  // Discord Blurple
          light: '#ffffff'
        },
        width: 300,
        margin: 2
      });

      const attachment = new AttachmentBuilder(qrBuffer, { name: 'invite-qr.png' });

      const embed = await createCustomEmbed(interaction, {
        title: '🔗 Premium Server Invite',
        description: `Here is your exclusive invite link: **${invite.url}**\n\n*Scan the QR code below from a mobile device to instantly join!*\n\n> ⚠️ This invite expires in 24 hours and is limited to 100 uses.`,
        image: 'attachment://invite-qr.png'
      });

      const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_v1_invite_link').setLabel('🔄 Sync Live Data').setStyle(ButtonStyle.Secondary));
      await interaction.editReply({ embeds: [embed], files: [attachment], components: [row] });
    } catch (error) {
      console.error(error);
      const errEmbed = createErrorEmbed('An error occurred while generating the invite link and QR code.');
      if (interaction.deferred || interaction.replied) {
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_v1_invite_link').setLabel('🔄 Sync Live Data').setStyle(ButtonStyle.Secondary));
        return await interaction.editReply({ embeds: [errEmbed], components: [row] });
      } else {
        await interaction.editReply({ embeds: [errEmbed], ephemeral: true });
      }
    }
  }
};


