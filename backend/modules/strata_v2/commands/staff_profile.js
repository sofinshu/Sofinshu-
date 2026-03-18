const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { Colors, FOOTER, progressBar, streakEmoji, formatMinutes, performanceColor } = require('../utils/embeds');
const { getOrCreateGuild, isManager } = require('../utils/permissions');
const { getOrCreateStaff, getPointsRank } = require('../utils/pointsManager');
const Warning = require('../models/Warning');
const Transaction = require('../models/Transaction');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('staff_profile')
    .setDescription('View detailed comprehensive profile of a specific staff member with all stats')
    .addUserOption(o => o.setName('user').setDescription('Staff member to view').setRequired(true)),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const target = interaction.options.getUser('user');
    const guildDoc = await getOrCreateGuild(interaction.guildId, interaction.guild.name);
    const staffMember = await getOrCreateStaff(target.id, interaction.guildId, target.username);
    const { rank: pointsRank, total } = await getPointsRank(target.id, interaction.guildId);
    const activeWarnings = await Warning.countDocuments({ userId: target.id, guildId: interaction.guildId, active: true });
    const weeklyHours = (staffMember.weeklyShiftMinutes / 60).toFixed(1);
    const totalHours = formatMinutes(staffMember.totalShiftMinutes);
    const goalHours = guildDoc.settings.shiftGoalHours || 40;
    const weeklyPct = Math.min(100, Math.round((staffMember.weeklyShiftMinutes / (goalHours * 60)) * 100));
    const perf = staffMember.calculatePerformance ? staffMember.calculatePerformance() : staffMember.performanceScore;
    const perfLabel = performanceColor(perf);
    const streak = staffMember.shiftStreak || 0;
    const member = await interaction.guild.members.fetch(target.id).catch(() => null);
    const canManage = await isManager(interaction.member, guildDoc);

    // Find next rank
    const ranks = guildDoc.ranks.sort((a, b) => a.position - b.position);
    const currRankIdx = ranks.findIndex(r => r.name.toLowerCase() === staffMember.rank?.toLowerCase());
    const nextRank = ranks[currRankIdx - 1];
    const nextRankProgress = nextRank
      ? Math.min(100, Math.round((staffMember.points / (nextRank.requiredPoints || 1)) * 100))
      : 100;

    const embed = new EmbedBuilder()
      .setColor(Colors.PRIMARY)
      .setTitle(`👤 STAFF PROFILE — @${target.username}`)
      .setThumbnail(target.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: '🏷️ Current Rank',    value: staffMember.rank || 'None',                        inline: true },
        { name: '📅 Staff Since',     value: `<t:${Math.floor(staffMember.joinedStaffAt/1000)}:D>`,  inline: true },
        { name: '⏱️ Total Hours',     value: totalHours,                                         inline: true },
        { name: '📊 This Week',       value: `${weeklyHours}h / ${goalHours}h goal`,             inline: true },
        { name: '🔥 Shift Streak',    value: `${streakEmoji(streak)} ${streak} days`,            inline: true },
        { name: '⭐ Points',          value: `${staffMember.points.toLocaleString()} pts`,        inline: true },
        { name: '🏆 Rank (Points)',   value: pointsRank ? `#${pointsRank} of ${total}` : 'N/A', inline: true },
        { name: '⚠️ Active Warnings', value: `${activeWarnings} warning${activeWarnings !== 1 ? 's' : ''}`, inline: true },
        { name: `📈 Performance`,     value: `${progressBar(perf, 100)} ${perf}/100 ${perfLabel}`, inline: false }
      )
      .setFooter({ text: `Profile ID: USR-${target.id.slice(-5)} • ${FOOTER}` })
      .setTimestamp();

    if (nextRank) {
      embed.addFields({
        name: `🎯 Progress to ${nextRank.name}`,
        value: `Points: \`${progressBar(nextRankProgress, 100)}\` ${nextRankProgress}% (${staffMember.points.toLocaleString()}/${nextRank.requiredPoints.toLocaleString()} needed)`,
        inline: false
      });
    }

    const row1Btns = [
      new ButtonBuilder().setCustomId(`sp_shifts_${target.id}`).setLabel('⏱️ Shifts').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`sp_points_${target.id}`).setLabel('⭐ Points').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`sp_warns_${target.id}`).setLabel('⚠️ Warnings').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel('📋 Full Profile').setURL(process.env.DASHBOARD_URL || 'https://strata.bot')
    ];
    if (canManage) {
      row1Btns.push(new ButtonBuilder().setCustomId(`sp_promote_${target.id}`).setLabel('⬆️ Promote').setStyle(ButtonStyle.Success));
    }
    const row1 = new ActionRowBuilder().addComponents(row1Btns.slice(0, 5));
    const components = [row1];

    if (canManage) {
      const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`sp_demote_${target.id}`).setLabel('⬇️ Demote').setStyle(ButtonStyle.Danger)
      );
      components.push(row2);
    }

    const msg = await interaction.editReply({ embeds: [embed], components });
    const col = msg.createMessageComponentCollector({ time: 300_000 });
    col.on('collect', async i => {
      if (i.user.id !== interaction.user.id) return i.reply({ content: '❌ Not yours.', ephemeral: true });
      if (i.customId.startsWith('sp_shifts_')) return showShiftSub(i, staffMember, target);
      if (i.customId.startsWith('sp_points_')) return showPointsSub(i, staffMember, target, pointsRank, total);
      if (i.customId.startsWith('sp_warns_')) return showWarnSub(i, target, interaction.guildId, activeWarnings);
    });
    col.on('end', () => { interaction.editReply({ components: [] }).catch(() => {}); });
  }
};

async function showShiftSub(interaction, staff, target) {
  const embed = new EmbedBuilder().setColor(Colors.PRIMARY).setTitle(`⏱️ SHIFT STATS — @${target.username}`)
    .setDescription(`**Total Hours:** ${formatMinutes(staff.totalShiftMinutes)}\n**Total Shifts:** ${staff.totalShiftsCompleted}\n**Streak:** ${streakEmoji(staff.shiftStreak)} ${staff.shiftStreak} days`)
    .setFooter({ text: FOOTER });
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('sp_back').setLabel('◀️ Back to Profile').setStyle(ButtonStyle.Secondary)
  );
  await interaction.update({ embeds: [embed], components: [row] });
}

async function showPointsSub(interaction, staff, target, rank, total) {
  const embed = new EmbedBuilder().setColor(Colors.GOLD).setTitle(`⭐ POINT DETAILS — @${target.username}`)
    .setDescription(`**Balance:** ${staff.points.toLocaleString()} points\n**Rank:** #${rank || 'N/A'} of ${total}\n**This Week:** +${staff.weeklyPoints.toLocaleString()}`)
    .setFooter({ text: FOOTER });
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('sp_back').setLabel('◀️ Back to Profile').setStyle(ButtonStyle.Secondary)
  );
  await interaction.update({ embeds: [embed], components: [row] });
}

async function showWarnSub(interaction, target, guildId, activeCount) {
  const embed = new EmbedBuilder().setColor(activeCount >= 3 ? Colors.ERROR : Colors.WARNING)
    .setTitle(`⚠️ WARNING HISTORY — @${target.username}`)
    .setDescription(`**Active Warnings:** ${activeCount}\n**Status:** ${activeCount >= 3 ? '🔴 At risk of escalation' : activeCount > 0 ? '🟡 Has warnings' : '🟢 Clear'}`)
    .setFooter({ text: FOOTER });
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('sp_back').setLabel('◀️ Back to Profile').setStyle(ButtonStyle.Secondary)
  );
  await interaction.update({ embeds: [embed], components: [row] });
}
