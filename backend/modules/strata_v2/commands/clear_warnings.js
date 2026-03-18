const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { Colors, FOOTER } = require('../utils/embeds');
const { getOrCreateGuild, isManager } = require('../utils/permissions');
const Warning = require('../models/Warning');
const Staff = require('../models/Staff');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clear_warnings')
    .setDescription('Clear all or specific warnings from a staff member record with confirmation')
    .addUserOption(o => o.setName('user').setDescription('Staff member to clear warnings for').setRequired(true))
    .addStringOption(o => o.setName('warning_id').setDescription('Specific warning ID to clear (omit to clear all)').setRequired(false)),

  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const warningId = interaction.options.getString('warning_id');
    const guildDoc = await getOrCreateGuild(interaction.guildId, interaction.guild.name);

    if (!await isManager(interaction.member, guildDoc)) {
      return interaction.reply({ embeds: [
        new EmbedBuilder().setColor(Colors.ERROR).setTitle('🔒 INSUFFICIENT PERMISSIONS').setDescription('You need a manager role to clear warnings.')
      ], ephemeral: true });
    }

    const activeCount = await Warning.countDocuments({ userId: target.id, guildId: interaction.guildId, active: true });

    if (activeCount === 0 && !warningId) {
      return interaction.reply({ embeds: [
        new EmbedBuilder().setColor(Colors.SUCCESS).setTitle('✅ No Warnings').setDescription(`<@${target.id}> has no active warnings to clear.`).setFooter({ text: FOOTER })
      ], ephemeral: true });
    }

    const confirmEmbed = new EmbedBuilder()
      .setColor(Colors.WARNING)
      .setTitle('🗑️ CLEAR WARNINGS')
      .setDescription(warningId
        ? `You are about to clear warning **${warningId}** for <@${target.id}>.`
        : `You are about to clear all **${activeCount}** active warnings for <@${target.id}>.`)
      .addFields(
        { name: '👤 Staff Member', value: `<@${target.id}>`,          inline: true },
        { name: '🗑️ Clearing',     value: warningId || `All ${activeCount} warnings`, inline: true },
        { name: '👤 Cleared By',   value: `<@${interaction.user.id}>`, inline: true },
        { name: '⚠️ Note',        value: 'Warnings are archived, not permanently deleted.', inline: false }
      )
      .setFooter({ text: FOOTER });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('cw_confirm').setLabel('🗑️ Confirm Clear').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('cw_cancel').setLabel('❌ Cancel').setStyle(ButtonStyle.Secondary)
    );

    const msg = await interaction.reply({ embeds: [confirmEmbed], components: [row], ephemeral: true });
    const col = msg.createMessageComponentCollector({ time: 30_000 });

    col.on('collect', async i => {
      if (i.user.id !== interaction.user.id) return i.reply({ content: '❌ Not yours.', ephemeral: true });
      col.stop();

      if (i.customId === 'cw_cancel') {
        return i.update({ embeds: [new EmbedBuilder().setColor(Colors.ERROR).setTitle('❌ Clear Cancelled')], components: [] });
      }

      let clearedCount = 0;
      if (warningId) {
        const result = await Warning.findOneAndUpdate(
          { warningId, guildId: interaction.guildId, active: true },
          { active: false, clearedBy: interaction.user.id, clearedAt: new Date() }
        );
        if (result) clearedCount = 1;
      } else {
        const result = await Warning.updateMany(
          { userId: target.id, guildId: interaction.guildId, active: true },
          { active: false, clearedBy: interaction.user.id, clearedAt: new Date() }
        );
        clearedCount = result.modifiedCount;
      }

      // Update staff warning count
      await Staff.findOneAndUpdate(
        { userId: target.id, guildId: interaction.guildId },
        { activeWarningCount: 0 }
      );

      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let ref = '#CLR-'; for (let j = 0; j < 5; j++) ref += chars[Math.floor(Math.random() * chars.length)];

      const successEmbed = new EmbedBuilder()
        .setColor(Colors.SUCCESS)
        .setTitle('✅ WARNINGS CLEARED')
        .addFields(
          { name: '🔢 Warnings Cleared', value: `${clearedCount} warnings`,                                                       inline: true },
          { name: '📈 New Status',        value: '✅ Clear',                                                                       inline: true },
          { name: '🕐 Cleared At',        value: `<t:${Math.floor(Date.now()/1000)}:F>`,                                          inline: true },
          { name: '🔢 Log Reference',     value: ref,                                                                             inline: true },
          { name: '👤 Cleared By',       value: `<@${interaction.user.id}>`,                                                    inline: true }
        )
        .setFooter({ text: '💠 Action archived in moderation logs' })
        .setTimestamp();

      await i.update({ embeds: [successEmbed], components: [] });

      // DM user
      try {
        await target.send({ embeds: [new EmbedBuilder().setColor(Colors.SUCCESS).setTitle('✅ WARNINGS CLEARED')
          .setDescription(`Your warnings in **${interaction.guild.name}** have been cleared by a manager.\n**Warnings Cleared:** ${clearedCount}`)
          .setFooter({ text: FOOTER })] });
      } catch {}
    });

    col.on('end', (_, reason) => {
      if (reason === 'time') msg.edit({ components: [] }).catch(() => {});
    });
  }
};
