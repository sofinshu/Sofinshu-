const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { Colors, FOOTER } = require('../utils/embeds');
const { getOrCreateGuild, isManager } = require('../utils/permissions');
const { getOrCreateStaff, removePoints } = require('../utils/pointsManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('demote')
    .setDescription('Demote a staff member to a lower rank with required reason and double confirmation')
    .addUserOption(o => o.setName('user').setDescription('Staff member to demote').setRequired(true))
    .addStringOption(o => o.setName('rank').setDescription('New (lower) rank').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason for demotion (required)').setRequired(true)),

  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const newRank = interaction.options.getString('rank');
    const reason = interaction.options.getString('reason');

    const guildDoc = await getOrCreateGuild(interaction.guildId, interaction.guild.name);
    if (!await isManager(interaction.member, guildDoc)) {
      return interaction.reply({ embeds: [
        new EmbedBuilder().setColor(Colors.ERROR).setTitle('🔒 INSUFFICIENT PERMISSIONS')
          .setDescription('You need a manager role to demote staff.')
      ], ephemeral: true });
    }

    const staffMember = await getOrCreateStaff(target.id, interaction.guildId, target.username);
    const previous = staffMember.rank;

    const confirmEmbed = new EmbedBuilder()
      .setColor(Colors.ERROR)
      .setTitle('⬇️ CONFIRM DEMOTION')
      .setDescription('⚠️ You are about to demote a staff member.')
      .addFields(
        { name: '👤 Staff Member', value: `<@${target.id}>`,          inline: true },
        { name: '📈 Current Rank', value: previous || 'None',         inline: true },
        { name: '📉 New Rank',     value: newRank,                     inline: true },
        { name: '📝 Reason',       value: reason,                      inline: false },
        { name: '👤 Demoted By',  value: `<@${interaction.user.id}>`, inline: true }
      )
      .addFields({ name: '⚠️ WARNING', value: 'This action is logged and cannot be easily undone. Please ensure this is correct.' })
      .setFooter({ text: FOOTER });

    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('demote_first').setLabel('⬇️ Confirm Demotion').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('demote_cancel').setLabel('❌ Cancel').setStyle(ButtonStyle.Secondary)
    );

    const msg = await interaction.reply({ embeds: [confirmEmbed], components: [row1] });
    const col = msg.createMessageComponentCollector({ time: 60_000 });

    col.on('collect', async i => {
      if (i.user.id !== interaction.user.id) return i.reply({ content: '❌ Not your action.', ephemeral: true });

      if (i.customId === 'demote_cancel') {
        col.stop();
        return i.update({ embeds: [new EmbedBuilder().setColor(Colors.ERROR).setTitle('❌ Demotion Cancelled')], components: [] });
      }

      if (i.customId === 'demote_first') {
        // Show double confirmation
        const double = new EmbedBuilder().setColor(Colors.ERROR).setTitle('⚠️ FINAL CONFIRMATION')
          .setDescription(`Are you **absolutely sure** you want to demote <@${target.id}> from **${previous}** to **${newRank}**?\n\nThis will:\n• Update Discord roles automatically\n• Deduct 50 points from their balance\n• Log to moderation history\n• Send DM notification`)
          .setFooter({ text: FOOTER });
        const row2 = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('demote_final').setLabel('⚠️ Yes, Demote').setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId('demote_cancel').setLabel('❌ No, Cancel').setStyle(ButtonStyle.Secondary)
        );
        return i.update({ embeds: [double], components: [row2] });
      }

      if (i.customId === 'demote_final') {
        col.stop();
        // Process demotion
        staffMember.rank = newRank;
        staffMember.rankHistory.push({ rank: newRank, action: 'demoted', reason, issuedBy: interaction.user.id });
        await staffMember.save();
        await removePoints(target.id, interaction.guildId, 50, 'admin', `Demoted to ${newRank}`, interaction.user.id);

        // Update Discord roles
        const member = await interaction.guild.members.fetch(target.id).catch(() => null);
        const rankConfig = guildDoc.ranks.find(r => r.name.toLowerCase() === newRank.toLowerCase());
        if (rankConfig?.roleId && member) {
          const oldRank = guildDoc.ranks.find(r => r.name.toLowerCase() === previous?.toLowerCase());
          if (oldRank?.roleId) await member.roles.remove(oldRank.roleId).catch(() => {});
          await member.roles.add(rankConfig.roleId).catch(() => {});
        }

        // DM
        try {
          await target.send({ embeds: [new EmbedBuilder().setColor(Colors.ERROR).setTitle('⬇️ YOU HAVE BEEN DEMOTED')
            .setDescription(`You have been demoted in **${interaction.guild.name}**.`)
            .addFields(
              { name: '📉 New Rank', value: newRank,                              inline: true },
              { name: '👤 By',      value: `<@${interaction.user.id}>`,           inline: true },
              { name: '📝 Reason',  value: reason,                               inline: false }
            ).setFooter({ text: FOOTER })] });
        } catch {}

        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let ref = '#DEMO-'; for (let j = 0; j < 5; j++) ref += chars[Math.floor(Math.random() * chars.length)];

        const success = new EmbedBuilder().setColor(Colors.ERROR).setTitle('⬇️ DEMOTION PROCESSED')
          .addFields(
            { name: '👤 Staff Member',    value: `<@${target.id}>`,                      inline: true },
            { name: '📈 Previous Rank',   value: previous || 'None',                      inline: true },
            { name: '📉 New Rank',        value: `${newRank} ⬇️`,                         inline: true },
            { name: '📝 Reason',          value: reason,                                  inline: false },
            { name: '👤 Demoted By',     value: `<@${interaction.user.id}>`,             inline: true },
            { name: '🕐 At',            value: `<t:${Math.floor(Date.now()/1000)}:F>`, inline: true },
            { name: '⭐ Points',          value: '-50 points deducted',                   inline: true },
            { name: '🔢 Log Reference',   value: ref,                                     inline: true }
          ).setFooter({ text: FOOTER }).setTimestamp();

        return i.update({ embeds: [success], components: [] });
      }
    });

    col.on('end', (_, reason) => {
      if (reason === 'time') msg.edit({ components: [] }).catch(() => {});
    });
  }
};
