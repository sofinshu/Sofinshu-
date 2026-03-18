const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { Colors, FOOTER } = require('../utils/embeds');
const { getOrCreateGuild, isManager } = require('../utils/permissions');
const { getOrCreateStaff, addPoints } = require('../utils/pointsManager');
const Staff = require('../models/Staff');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('promote')
    .setDescription('Promote a staff member to a higher rank with confirmation and role update')
    .addUserOption(o => o.setName('user').setDescription('Staff member to promote').setRequired(true))
    .addStringOption(o => o.setName('rank').setDescription('Target rank').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason for promotion').setRequired(false)),

  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const newRank = interaction.options.getString('rank');
    const reason = interaction.options.getString('reason') || 'No reason provided.';

    const guildDoc = await getOrCreateGuild(interaction.guildId, interaction.guild.name);
    if (!await isManager(interaction.member, guildDoc)) {
      return interaction.reply({ embeds: [
        new EmbedBuilder().setColor(Colors.ERROR).setTitle('🔒 INSUFFICIENT PERMISSIONS')
          .setDescription('You need one of the configured manager roles to promote staff.\nContact an administrator.')
      ], ephemeral: true });
    }

    const staffMember = await getOrCreateStaff(target.id, interaction.guildId, target.username);
    const member = await interaction.guild.members.fetch(target.id).catch(() => null);

    const confirmEmbed = new EmbedBuilder()
      .setColor(Colors.WARNING)
      .setTitle('⬆️ CONFIRM PROMOTION')
      .setDescription('You are about to promote a staff member.')
      .addFields(
        { name: '👤 Staff Member',   value: `<@${target.id}>`,                            inline: true },
        { name: '📉 Current Rank',   value: staffMember.rank || 'None',                   inline: true },
        { name: '📈 New Rank',       value: newRank,                                       inline: true },
        { name: '📝 Reason',         value: reason,                                        inline: false },
        { name: '👤 Promoted By',    value: `<@${interaction.user.id}>`,                  inline: true },
        { name: '⭐ Points Bonus',   value: '+100 points',                                 inline: true }
      )
      .addFields({ name: '⚠️ This action will:', value: '• Update Discord roles automatically\n• Award 100 bonus points\n• Send DM notification\n• Log to promotion history' })
      .setFooter({ text: FOOTER });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('promote_confirm').setLabel('✅ Confirm Promotion').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('promote_cancel').setLabel('❌ Cancel').setStyle(ButtonStyle.Danger)
    );

    const msg = await interaction.reply({ embeds: [confirmEmbed], components: [row] });
    const col = msg.createMessageComponentCollector({ time: 60_000 });

    col.on('collect', async i => {
      if (i.user.id !== interaction.user.id) return i.reply({ content: '❌ Not your action.', ephemeral: true });
      col.stop();

      if (i.customId === 'promote_cancel') {
        const cancelled = new EmbedBuilder().setColor(Colors.ERROR).setTitle('❌ Promotion Cancelled').setFooter({ text: FOOTER });
        return i.update({ embeds: [cancelled], components: [] });
      }

      // Process promotion
      const previous = staffMember.rank;
      staffMember.rank = newRank;
      staffMember.rankHistory.push({ rank: newRank, action: 'promoted', reason, issuedBy: interaction.user.id });
      await staffMember.save();
      await addPoints(target.id, interaction.guildId, 100, 'promotion', `Promoted to ${newRank}`, interaction.user.id);

      // Update Discord role
      const rankConfig = guildDoc.ranks.find(r => r.name.toLowerCase() === newRank.toLowerCase());
      if (rankConfig?.roleId && member) {
        try {
          const oldRank = guildDoc.ranks.find(r => r.name.toLowerCase() === previous?.toLowerCase());
          if (oldRank?.roleId) await member.roles.remove(oldRank.roleId).catch(() => {});
          await member.roles.add(rankConfig.roleId).catch(() => {});
        } catch {}
      }

      // Try DM
      try {
        const dm = new EmbedBuilder().setColor(Colors.SUCCESS).setTitle('🎉 YOU\'VE BEEN PROMOTED!')
          .setDescription(`Congratulations! You've been promoted in **${interaction.guild.name}**!`)
          .addFields(
            { name: '📈 New Rank',   value: newRank,                                                             inline: true },
            { name: '👤 By',        value: `<@${interaction.user.id}>`,                                         inline: true },
            { name: '📝 Reason',    value: reason,                                                              inline: false },
            { name: '⭐ Bonus',     value: `+100 points! Keep up the great work!`,                              inline: false }
          ).setFooter({ text: FOOTER });
        await target.send({ embeds: [dm] });
      } catch {}

      const success = new EmbedBuilder()
        .setColor(Colors.SUCCESS)
        .setTitle('🎉 PROMOTION SUCCESSFUL!')
        .addFields(
          { name: '👤 Staff Member',  value: `<@${target.id}>`,                                    inline: true },
          { name: '📉 Previous',      value: previous || 'None',                                   inline: true },
          { name: '📈 New Rank',      value: `${newRank} ⬆️`,                                      inline: true },
          { name: '🕐 Promoted At',   value: `<t:${Math.floor(Date.now()/1000)}:F>`,                inline: true },
          { name: '⭐ Points Earned', value: '+100 bonus points',                                   inline: true },
          { name: '👤 By',           value: `<@${interaction.user.id}>`,                           inline: true },
          { name: '📝 Reason',       value: reason,                                                 inline: false }
        )
        .setFooter({ text: '💠 Congratulations! 🎊' })
        .setTimestamp();

      const successRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('profile_view').setLabel('📋 View Profile').setStyle(ButtonStyle.Secondary)
      );
      await i.update({ embeds: [success], components: [successRow] });
    });

    col.on('end', (_, reason) => {
      if (reason === 'time') msg.edit({ components: [] }).catch(() => {});
    });
  }
};
