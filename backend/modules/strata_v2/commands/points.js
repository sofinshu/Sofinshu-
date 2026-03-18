const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { Colors, FOOTER, progressBar } = require('../utils/embeds');
const { getOrCreateStaff, getPointsRank, getTopPoints, getRecentTransactions } = require('../utils/pointsManager');
const { premiumUpsell } = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('points')
    .setDescription('View your own point balance transaction history and earning sources')
    .addUserOption(o => o.setName('user').setDescription('Check another user\'s points').setRequired(false)),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const targetUser = interaction.options.getUser('user') || interaction.user;
    const staffMember = await getOrCreateStaff(targetUser.id, interaction.guildId, targetUser.username);
    const { rank, total } = await getPointsRank(targetUser.id, interaction.guildId);
    const recent = await getRecentTransactions(targetUser.id, interaction.guildId, 5);

    const total_pts = staffMember.points;
    const next_milestone = [1000, 2500, 5000, 10000, 25000, 50000, 100000].find(m => m > total_pts) || total_pts;
    const to_next = next_milestone - total_pts;
    const weekly_gained = staffMember.weeklyPoints;

    const historyLines = recent.map(t => {
      const sign = t.amount >= 0 ? '+' : '';
      const ts = Math.floor(t.timestamp/1000);
      return `${sign}${t.amount} — ${t.reason.substring(0, 40)} • <t:${ts}:R>`;
    }).join('\n');

    const embed = new EmbedBuilder()
      .setColor(Colors.GOLD)
      .setTitle(`⭐ POINTS — @${targetUser.username}`)
      .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: '⭐ Total Points',     value: `**${total_pts.toLocaleString()}** points`,         inline: true },
        { name: '🏆 Server Rank',     value: rank ? `#${rank} of ${total} staff` : 'N/A',        inline: true },
        { name: '📈 This Week',        value: `+${weekly_gained.toLocaleString()} earned`,         inline: true },
        { name: '🎯 Next Milestone',   value: `${next_milestone.toLocaleString()} pts — ${to_next.toLocaleString()} away`, inline: false },
        { name: '📊 Milestone Progress', value: `\`${progressBar(total_pts, next_milestone)}\` ${Math.round((total_pts/next_milestone)*100)}%`, inline: false }
      )
      .setFooter({ text: FOOTER })
      .setTimestamp();

    if (historyLines) {
      embed.addFields({ name: '📜 Recent History (Last 5)', value: historyLines || '*No transactions yet.*', inline: false });
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('pts_leaderboard').setLabel('🏆 Leaderboard').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel('📊 Point History').setURL(process.env.DASHBOARD_URL || 'https://strata.bot'),
      new ButtonBuilder().setCustomId('pts_rewards').setLabel('🎁 Rewards').setStyle(ButtonStyle.Primary)
    );

    const msg = await interaction.editReply({ embeds: [embed], components: [row] });
    const col = msg.createMessageComponentCollector({ time: 120_000 });
    col.on('collect', async i => {
      if (i.user.id !== interaction.user.id) return i.reply({ content: '❌ Not yours.', ephemeral: true });
      if (i.customId === 'pts_leaderboard') {
        const top = await getTopPoints(interaction.guildId, 10);
        const medals = ['🥇', '🥈', '🥉'];
        const list = top.map((s, idx) => `${medals[idx] || `${idx+1}.`} **${s.username}** — ${s.points.toLocaleString()} pts`).join('\n');
        const lb = new EmbedBuilder().setColor(Colors.GOLD).setTitle('🏆 POINTS LEADERBOARD')
          .setDescription(list || 'No data yet.').setFooter({ text: FOOTER });
        return i.reply({ embeds: [lb], ephemeral: true });
      }
      if (i.customId === 'pts_rewards') {
        return i.reply({ embeds: [premiumUpsell('Premium')], ephemeral: true });
      }
    });
    col.on('end', () => { interaction.editReply({ components: [] }).catch(() => {}); });
  }
};
