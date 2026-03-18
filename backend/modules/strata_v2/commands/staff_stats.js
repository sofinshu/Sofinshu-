const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { Colors, FOOTER, progressBar } = require('../utils/embeds');
const Staff = require('../models/Staff');
const Shift = require('../models/Shift');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('staff_stats')
    .setDescription('View aggregated server-wide staff performance statistics and activity metrics')
    .addStringOption(o => o.setName('period').setDescription('Time period').setRequired(false)
      .addChoices({ name: 'Today', value: 'today' }, { name: 'This Week', value: 'week' }, { name: 'This Month', value: 'month' }, { name: 'All Time', value: 'all' })),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    await sendStaffStats(interaction, interaction.options.getString('period') || 'week', false);
  }
};

async function sendStaffStats(interaction, period, isUpdate) {
  const allStaff = await Staff.find({ guildId: interaction.guildId, isActive: true });
  const activeShifts = await Shift.find({ guildId: interaction.guildId, status: 'active' });

  const totalStaff = allStaff.length;
  const onShift = activeShifts.length;
  const totalPoints = allStaff.reduce((a, s) => a + s.points, 0);
  const avgPerf = totalStaff > 0 ? Math.round(allStaff.reduce((a, s) => a + (s.performanceScore || 50), 0) / totalStaff) : 0;

  let statField = 'totalShiftMinutes';
  if (period === 'week') statField = 'weeklyShiftMinutes';

  const sorted = [...allStaff].sort((a, b) => (b[statField] || 0) - (a[statField] || 0));
  const top5 = sorted.slice(0, 5);
  const medals = ['🥇', '🥈', '🥉', '4.', '5.'];

  const top5Lines = top5.map((s, i) => {
    const mins = s[statField] || 0;
    const h = Math.floor(mins / 60), m = mins % 60;
    return `${medals[i]} **${s.username || 'Unknown'}** — ${h}h ${m}m — ⭐ ${s.points.toLocaleString()} pts`;
  }).join('\n');

  const periodLabel = { today: 'Today', week: 'This Week', month: 'This Month', all: 'All Time' }[period];

  const embed = new EmbedBuilder()
    .setColor(Colors.PRIMARY)
    .setTitle(`📊 STAFF OVERVIEW — ${periodLabel}`)
    .addFields(
      { name: '👥 Total Staff',      value: `${totalStaff} members`,                              inline: true },
      { name: '⏱️ On Shift Now',     value: `${onShift} members`,                                 inline: true },
      { name: '⭐ Total Points',     value: totalPoints.toLocaleString(),                          inline: true },
      { name: `📈 Avg Performance`,  value: `${progressBar(avgPerf, 100)} ${avgPerf}/100`,         inline: false },
      { name: `🏆 Top 5 — ${periodLabel}`, value: top5Lines || 'No data yet.', inline: false }
    )
    .setFooter({ text: `Updated: ${FOOTER}` })
    .setTimestamp();

  const periodRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ss_today').setLabel('📅 Today').setStyle(period === 'today' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('ss_week').setLabel('📆 Week').setStyle(period === 'week' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('ss_month').setLabel('🗓️ Month').setStyle(period === 'month' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('ss_all').setLabel('📊 All Time').setStyle(period === 'all' ? ButtonStyle.Primary : ButtonStyle.Secondary)
  );
  const actRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel('📊 Full Analytics').setURL(process.env.DASHBOARD_URL || 'https://strata.bot'),
    new ButtonBuilder().setCustomId(`ss_ref_${period}`).setLabel('🔄 Refresh').setStyle(ButtonStyle.Secondary)
  );

  const opts = { embeds: [embed], components: [periodRow, actRow] };
  const msg = isUpdate ? await interaction.update(opts) : await interaction.editReply(opts);

  if (!isUpdate) {
    const col = (await interaction.fetchReply()).createMessageComponentCollector({ time: 180_000 });
    col.on('collect', async i => {
      if (i.user.id !== interaction.user.id) return i.reply({ content: '❌ Not yours.', ephemeral: true });
      const p = i.customId.replace('ss_', '').replace(/^ref_/, '');
      const validPeriods = ['today', 'week', 'month', 'all'];
      await sendStaffStats(i, validPeriods.includes(p) ? p : 'week', true);
    });
    col.on('end', () => { interaction.editReply({ components: [] }).catch(() => {}); });
  }
}
