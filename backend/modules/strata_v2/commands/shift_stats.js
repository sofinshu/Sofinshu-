const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { Colors, FOOTER, progressBar, streakEmoji, formatMinutes } = require('../utils/embeds');
const { getOrCreateStaff } = require('../utils/pointsManager');
const Shift = require('../models/Shift');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('shift_stats')
    .setDescription('View personal or staff member shift statistics filtered by time period')
    .addUserOption(o => o.setName('user').setDescription('Staff member (defaults to you)').setRequired(false))
    .addStringOption(o => o.setName('period').setDescription('Time period').setRequired(false)
      .addChoices({ name: 'Today', value: 'today' }, { name: 'This Week', value: 'week' }, { name: 'This Month', value: 'month' }, { name: 'All Time', value: 'all' })),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const targetUser = interaction.options.getUser('user') || interaction.user;
    const period = interaction.options.getString('period') || 'week';
    await sendShiftStats(interaction, targetUser, period, false);
  }
};

async function sendShiftStats(interaction, targetUser, period, isUpdate) {
  const staffMember = await getOrCreateStaff(targetUser.id, interaction.guildId, targetUser.username);
  const now = new Date();
  let startDate = new Date(0);
  if (period === 'today') { startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()); }
  else if (period === 'week') { startDate = new Date(now); startDate.setDate(now.getDate() - 7); }
  else if (period === 'month') { startDate = new Date(now); startDate.setMonth(now.getMonth() - 1); }

  const shifts = await Shift.find({
    userId: targetUser.id, guildId: interaction.guildId, status: 'completed',
    ...(period !== 'all' ? { clockIn: { $gte: startDate } } : {})
  }).sort({ clockIn: -1 });

  const totalMins = shifts.reduce((a, s) => a + (s.durationMinutes || 0), 0);
  const avgMins = shifts.length > 0 ? Math.round(totalMins / shifts.length) : 0;
  const longestShift = shifts.reduce((max, s) => s.durationMinutes > (max?.durationMinutes || 0) ? s : max, null);

  // Daily breakdown (last 7 days)
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dailyData = new Array(7).fill(0);
  const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 6);
  for (const shift of shifts) {
    if (shift.clockIn >= weekAgo) {
      const dayIdx = shift.clockIn.getDay();
      dailyData[dayIdx] += shift.durationMinutes / 60;
    }
  }
  const maxDay = Math.max(...dailyData, 1);
  const dayBreakdown = days.map((day, i) => {
    const h = dailyData[i].toFixed(1);
    const pct = Math.round((dailyData[i] / maxDay) * 100);
    return `${day} \`${progressBar(pct, 8, 8)}\` ${h}h`;
  }).join('\n');

  const periodLabel = { today: 'Today', week: 'This Week', month: 'This Month', all: 'All Time' }[period];

  const embed = new EmbedBuilder()
    .setColor(Colors.PRIMARY)
    .setTitle(`📊 SHIFT STATISTICS — @${targetUser.username}`)
    .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
    .addFields(
      { name: `⏱️ ${periodLabel} Total`,  value: formatMinutes(totalMins),                               inline: true },
      { name: '📅 Shifts Done',           value: `${shifts.length} shifts`,                              inline: true },
      { name: '⏳ Avg Shift',             value: formatMinutes(avgMins),                                  inline: true },
      { name: '🏆 Longest (period)',      value: longestShift ? formatMinutes(longestShift.durationMinutes) : 'N/A', inline: true },
      { name: '⭐ All-Time Total',        value: formatMinutes(staffMember.totalShiftMinutes),            inline: true },
      { name: '🔥 Streak',               value: `${streakEmoji(staffMember.shiftStreak)} ${staffMember.shiftStreak} days`, inline: true },
      { name: '📊 Daily Breakdown (7d)', value: `\`\`\`\n${dayBreakdown}\n\`\`\``, inline: false }
    )
    .setFooter({ text: `Tracking since ${new Date(staffMember.joinedStaffAt).toLocaleDateString()} • ${FOOTER}` })
    .setTimestamp();

  const periodRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('shst_today').setLabel('📅 Today').setStyle(period === 'today' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('shst_week').setLabel('📆 Week').setStyle(period === 'week' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('shst_month').setLabel('🗓️ Month').setStyle(period === 'month' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('shst_all').setLabel('📊 All').setStyle(period === 'all' ? ButtonStyle.Primary : ButtonStyle.Secondary)
  );
  const actRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel('📋 Full Report').setURL(process.env.DASHBOARD_URL || 'https://strata.bot'),
    new ButtonBuilder().setCustomId(`shst_ref_${period}`).setLabel('🔄 Refresh').setStyle(ButtonStyle.Secondary)
  );

  const opts = { embeds: [embed], components: [periodRow, actRow] };
  const msg = isUpdate ? await interaction.update(opts) : await interaction.editReply(opts);

  if (!isUpdate) {
    const reply = await interaction.fetchReply();
    const col = reply.createMessageComponentCollector({ time: 180_000 });
    col.on('collect', async i => {
      if (i.user.id !== interaction.user.id) return i.reply({ content: '❌ Not yours.', ephemeral: true });
      const p = i.customId.replace('shst_', '').replace(/^ref_/, '');
      const valid = ['today', 'week', 'month', 'all'];
      await sendShiftStats(i, targetUser, valid.includes(p) ? p : 'week', true);
    });
    col.on('end', () => { interaction.editReply({ components: [] }).catch(() => {}); });
  }
}
