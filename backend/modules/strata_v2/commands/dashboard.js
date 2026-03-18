const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const { Colors, FOOTER, progressBar } = require('../utils/embeds');
const { getOrCreateGuild } = require('../utils/permissions');
const Staff = require('../models/Staff');
const Shift = require('../models/Shift');
const Warning = require('../models/Warning');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dashboard')
    .setDescription('View quick server dashboard overview with key metrics and actions'),

  async execute(interaction) {
    await interaction.deferReply();
    const guildDoc = await getOrCreateGuild(interaction.guildId, interaction.guild.name);

    const [allStaff, activeShifts, openWarnings] = await Promise.all([
      Staff.find({ guildId: interaction.guildId, isActive: true }),
      Shift.find({ guildId: interaction.guildId, status: 'active' }),
      Warning.find({ guildId: interaction.guildId, active: true })
    ]);

    const totalStaff = allStaff.length;
    const onShift = activeShifts.length;
    const totalPoints = allStaff.reduce((a, s) => a + s.points, 0);
    const topPerformer = allStaff.sort((a, b) => b.weeklyShiftMinutes - a.weeklyShiftMinutes)[0];
    const weeklyMinutes = allStaff.reduce((a, s) => a + s.weeklyShiftMinutes, 0);
    const weeklyTarget = totalStaff * (guildDoc.settings.shiftGoalHours || 40) * 60;
    const activityPct = weeklyTarget > 0 ? Math.round((weeklyMinutes / weeklyTarget) * 100) : 0;

    const tierEmoji = { free: '🟢 Free', premium: '🔵 Premium', enterprise: '🟣 Enterprise' };

    const embed = new EmbedBuilder()
      .setColor(Colors.PRIMARY)
      .setTitle(`📊 ${interaction.guild.name} — QUICK DASHBOARD`)
      .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
      .setDescription('Here\'s your server\'s staff management snapshot.\nVisit the web dashboard for full analytics.')
      .addFields(
        { name: '📋 Total Staff',      value: `${totalStaff} members`,                                                    inline: true },
        { name: '⏱️ Active Shifts',    value: `${onShift} running`,                                                       inline: true },
        { name: '⚠️ Active Warnings',  value: `${openWarnings.length} total`,                                              inline: true },
        { name: '⭐ Total Points',     value: totalPoints.toLocaleString(),                                                inline: true },
        { name: '⭐ Server Tier',      value: tierEmoji[guildDoc.tier],                                                   inline: true },
        { name: '🏆 Top (Shifts/wk)', value: topPerformer ? `@${topPerformer.username} (${Math.floor(topPerformer.weeklyShiftMinutes/60)}h)` : 'N/A', inline: true },
        { name: `📈 Weekly Activity — ${activityPct}%`, value: `\`${progressBar(activityPct, 100)}\` ${activityPct}%`, inline: false }
      )
      .setFooter({ text: FOOTER })
      .setTimestamp();

    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel('🌐 Open Dashboard').setURL(process.env.DASHBOARD_URL || 'https://strata.bot'),
      new ButtonBuilder().setCustomId('dash_refresh').setLabel('🔄 Refresh').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('dash_settings').setLabel('⚙️ Quick Settings').setStyle(ButtonStyle.Secondary)
    );

    const row2 = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('dash_action')
        .setPlaceholder('⚡ Quick Actions...')
        .addOptions([
          { label: '👥 View Staff List',     value: 'staff_list',    emoji: '👥' },
          { label: '⏱️ Active Shifts',       value: 'shifts',        emoji: '⏱️' },
          { label: '⚠️ Recent Warnings',     value: 'warnings',      emoji: '⚠️' },
          { label: '📈 Today\'s Summary',    value: 'summary',       emoji: '📈' },
          { label: '🏆 Top Performers',      value: 'leaderboard',   emoji: '🏆' }
        ])
    );

    const msg = await interaction.editReply({ embeds: [embed], components: [row1, row2] });
    const col = msg.createMessageComponentCollector({ time: 180_000 });

    col.on('collect', async i => {
      if (i.user.id !== interaction.user.id) return i.reply({ content: '❌ Not your dashboard.', ephemeral: true });
      if (i.customId === 'dash_refresh') return interaction.editReply({ embeds: [embed], components: [row1, row2] }).then(() => i.deferUpdate());
      if (i.customId === 'dash_settings') return showSettings(i);
      if (i.customId === 'dash_action') return handleQuickAction(i, i.values[0], interaction.guildId, allStaff, activeShifts);
    });
    col.on('end', () => { interaction.editReply({ components: [] }).catch(() => {}); });
  }
};

async function showSettings(interaction) {
  const embed = new EmbedBuilder()
    .setColor(Colors.PRIMARY)
    .setTitle('⚙️ QUICK SETTINGS (Only Visible to You)')
    .addFields(
      { name: '🔔 Notifications', value: 'Enabled', inline: true },
      { name: '🕐 Timezone',     value: 'UTC',      inline: true },
      { name: '🌍 Language',     value: 'English',  inline: true }
    )
    .setFooter({ text: FOOTER });
  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleQuickAction(interaction, action, guildId, allStaff, activeShifts) {
  let embed;
  if (action === 'staff_list') {
    const list = allStaff.slice(0, 10).map((s, i) => `${i + 1}. **${s.username}** — ${s.rank} — ⭐ ${s.points.toLocaleString()} pts`).join('\n');
    embed = new EmbedBuilder().setColor(Colors.PRIMARY).setTitle('👥 Staff List').setDescription(list || 'No staff found.').setFooter({ text: FOOTER });
  } else if (action === 'shifts') {
    const list = activeShifts.slice(0, 10).map(s => `• <@${s.userId}> — ${s.role} — started <t:${Math.floor(s.clockIn/1000)}:R>`).join('\n');
    embed = new EmbedBuilder().setColor(Colors.SUCCESS).setTitle('⏱️ Active Shifts').setDescription(list || 'No active shifts.').setFooter({ text: FOOTER });
  } else if (action === 'warnings') {
    const warns = await Warning.find({ guildId, active: true }).sort({ issuedAt: -1 }).limit(5);
    const list = warns.map(w => `⚠️ <@${w.userId}> — ${w.reason.substring(0, 50)} — *${w.severity}*`).join('\n');
    embed = new EmbedBuilder().setColor(Colors.WARNING).setTitle('⚠️ Recent Warnings').setDescription(list || 'No active warnings.').setFooter({ text: FOOTER });
  } else if (action === 'leaderboard') {
    const top = allStaff.sort((a, b) => b.points - a.points).slice(0, 10);
    const medals = ['🥇', '🥈', '🥉'];
    const list = top.map((s, i) => `${medals[i] || `${i+1}.`} **${s.username}** — ⭐ ${s.points.toLocaleString()} pts`).join('\n');
    embed = new EmbedBuilder().setColor(Colors.GOLD).setTitle('🏆 Top Performers').setDescription(list || 'No data.').setFooter({ text: FOOTER });
  } else {
    embed = new EmbedBuilder().setColor(Colors.PRIMARY).setTitle('📈 Today\'s Summary').setDescription('Daily analytics coming soon. Visit the web dashboard for full insights.').setFooter({ text: FOOTER });
  }
  await interaction.reply({ embeds: [embed], ephemeral: true });
}
