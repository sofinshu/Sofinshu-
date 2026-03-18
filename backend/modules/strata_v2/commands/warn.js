const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { Colors, FOOTER, severityColor } = require('../utils/embeds');
const { getOrCreateGuild, isManager } = require('../utils/permissions');
const { getOrCreateStaff, removePoints } = require('../utils/pointsManager');
const Warning = require('../models/Warning');

const SEVERITY_PTS = { minor: 10, moderate: 25, major: 50, critical: 100 };

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Issue a warning to a staff member with reason severity level and threshold alerts')
    .addUserOption(o => o.setName('user').setDescription('Staff member to warn').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason for warning').setRequired(true))
    .addStringOption(o => o.setName('severity').setDescription('Warning severity').setRequired(false)
      .addChoices({ name: 'Minor', value: 'minor' }, { name: 'Moderate', value: 'moderate' }, { name: 'Major', value: 'major' }, { name: 'Critical', value: 'critical' })),

  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason');
    const severity = interaction.options.getString('severity') || 'moderate';
    const guildDoc = await getOrCreateGuild(interaction.guildId, interaction.guild.name);

    if (!await isManager(interaction.member, guildDoc)) {
      return interaction.reply({ embeds: [
        new EmbedBuilder().setColor(Colors.ERROR).setTitle('🔒 INSUFFICIENT PERMISSIONS').setDescription('You need a manager role to issue warnings.')
      ], ephemeral: true });
    }

    const staffMember = await getOrCreateStaff(target.id, interaction.guildId, target.username);
    const activeWarnings = await Warning.countDocuments({ userId: target.id, guildId: interaction.guildId, active: true });
    const threshold = guildDoc.settings.warningThreshold || 3;

    const confirmEmbed = new EmbedBuilder()
      .setColor(severityColor(severity))
      .setTitle('⚠️ ISSUE WARNING')
      .addFields(
        { name: '👤 Staff Member',   value: `<@${target.id}>`,                                    inline: true },
        { name: '🔴 Severity',       value: severity.charAt(0).toUpperCase() + severity.slice(1), inline: true },
        { name: '⭐ Points Deducted',value: `-${SEVERITY_PTS[severity]}`,                          inline: true },
        { name: '📝 Reason',         value: reason,                                                inline: false },
        { name: '⚠️ Current Count', value: `${activeWarnings} warnings`,                          inline: true },
        { name: '🚨 After This',     value: `${activeWarnings + 1} / ${threshold} threshold`,     inline: true },
        { name: '👤 Issued By',      value: `<@${interaction.user.id}>`,                          inline: true }
      )
      .setFooter({ text: FOOTER });

    if (activeWarnings + 1 >= threshold) {
      confirmEmbed.addFields({ name: '🚨 THRESHOLD WARNING', value: 'This will reach or exceed the warning threshold!', inline: false });
    }

    const confirmRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('warn_confirm').setLabel('⚠️ Confirm Warning').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('warn_cancel').setLabel('❌ Cancel').setStyle(ButtonStyle.Secondary)
    );

    const msg = await interaction.reply({ embeds: [confirmEmbed], components: [confirmRow] });
    const col = msg.createMessageComponentCollector({ time: 60_000 });

    col.on('collect', async i => {
      if (i.user.id !== interaction.user.id) return i.reply({ content: '❌ Not yours.', ephemeral: true });
      col.stop();

      if (i.customId === 'warn_cancel') {
        return i.update({ embeds: [new EmbedBuilder().setColor(Colors.ERROR).setTitle('❌ Warning Cancelled')], components: [] });
      }

      // Create warning
      const pts = SEVERITY_PTS[severity];
      const warning = await Warning.create({
        userId: target.id, guildId: interaction.guildId, reason, severity,
        issuedBy: interaction.user.id, issuedByName: interaction.user.username, pointsDeducted: pts
      });

      // Deduct points
      await removePoints(target.id, interaction.guildId, pts, 'warning', `Warning issued: ${reason}`, interaction.user.id);

      // Update staff warning count
      staffMember.warningCount = (staffMember.warningCount || 0) + 1;
      staffMember.activeWarningCount = activeWarnings + 1;
      await staffMember.save();

      const newActiveCount = activeWarnings + 1;
      const atThreshold = newActiveCount >= threshold;

      const successEmbed = new EmbedBuilder()
        .setColor(severityColor(severity))
        .setTitle('⚠️ WARNING ISSUED')
        .addFields(
          { name: '👤 Staff Member',  value: `<@${target.id}>`,                                     inline: true },
          { name: '📝 Reason',        value: reason,                                                 inline: false },
          { name: '🔴 Severity',      value: severity.charAt(0).toUpperCase() + severity.slice(1),  inline: true },
          { name: '🔢 Warning ID',    value: warning.warningId,                                      inline: true },
          { name: '⭐ Points Deducted',value: `-${pts}`,                                              inline: true },
          { name: '🕐 Issued At',     value: `<t:${Math.floor(Date.now()/1000)}:F>`,                 inline: true },
          { name: '👤 Issued By',    value: `<@${interaction.user.id}>`,                            inline: true }
        )
        .setFooter({ text: '💠 Warning logged • Staff member notified via DM' })
        .setTimestamp();

      if (atThreshold) successEmbed.addFields({ name: '🚨 THRESHOLD REACHED!', value: 'Consider further action below.', inline: false });

      const actionBtns = [new ButtonBuilder().setCustomId(`viewwarn_${target.id}`).setLabel('📋 View Profile').setStyle(ButtonStyle.Secondary)];
      if (atThreshold) {
        actionBtns.push(
          new ButtonBuilder().setCustomId(`mute_user_${target.id}`).setLabel('🔇 Mute').setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId(`kick_user_${target.id}`).setLabel('👢 Kick').setStyle(ButtonStyle.Danger)
        );
      }
      const successRow = new ActionRowBuilder().addComponents(actionBtns.slice(0, 5));
      await i.update({ embeds: [successEmbed], components: [successRow] });

      // Log to channel
      if (guildDoc.channels?.moderation) {
        try {
          const logCh = await interaction.guild.channels.fetch(guildDoc.channels.moderation);
          if (logCh) {
            await logCh.send({ embeds: [successEmbed] });
          }
        } catch {}
      }

      // DM the warned user
      try {
        const dmEmbed = new EmbedBuilder().setColor(severityColor(severity)).setTitle('⚠️ YOU HAVE RECEIVED A WARNING')
          .setDescription(`You have received a warning in **${interaction.guild.name}**.`)
          .addFields(
            { name: '📝 Reason',           value: reason,                                                 inline: false },
            { name: '🔴 Severity',         value: severity.charAt(0).toUpperCase() + severity.slice(1),  inline: true },
            { name: '⚠️ Warning Count',    value: `${newActiveCount} of ${threshold}`,                    inline: true },
            { name: '🕐 Issued At',        value: `<t:${Math.floor(Date.now()/1000)}:F>`,                 inline: false }
          )
          .setFooter({ text: 'If you believe this is an error, contact a manager.' });
        if (atThreshold) dmEmbed.addFields({ name: '⚠️ Notice', value: 'Further violations may result in escalation.', inline: false });
        await target.send({ embeds: [dmEmbed] });
      } catch {}
    });

    col.on('end', (_, reason) => {
      if (reason === 'time') msg.edit({ components: [] }).catch(() => {});
    });
  }
};
