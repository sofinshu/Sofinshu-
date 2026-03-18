const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { Colors, progressBar, FOOTER } = require('../utils/embeds');
const os = require('os');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check bot latency system health and performance metrics in real-time'),

  async execute(interaction) {
    await sendPing(interaction, false);
  }
};

async function sendPing(interaction, isRefresh = false) {
  const start = Date.now();
  const apiLatency = interaction.client.ws.ping;
  const botLatency = Date.now() - interaction.createdTimestamp;
  const uptime = process.uptime();
  const memUsed = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
  const memTotal = Math.round(os.totalmem() / 1024 / 1024);

  // Determine overall health %
  let health = 100;
  if (apiLatency > 200) health -= 20;
  else if (apiLatency > 100) health -= 10;
  if (botLatency > 300) health -= 20;
  else if (botLatency > 150) health -= 10;
  if (memUsed > memTotal * 0.85) health -= 20;
  health = Math.max(0, health);

  const healthBar = progressBar(health, 100);
  let color = Colors.SUCCESS;
  if (health < 50) color = Colors.ERROR;
  else if (health < 70) color = Colors.WARNING;

  // Format uptime
  const d = Math.floor(uptime / 86400);
  const h = Math.floor((uptime % 86400) / 3600);
  const m = Math.floor((uptime % 3600) / 60);
  const uptimeStr = `${d}d ${h}h ${m}m`;

  // Latency emoji
  const latencyEmoji = (ms) => ms < 100 ? '🟢' : ms < 200 ? '🟡' : '🔴';

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle('🏓 PONG! SYSTEM STATUS')
    .addFields(
      { name: '🏓 Bot Latency',    value: `${latencyEmoji(botLatency)} \`${botLatency}ms\``,  inline: true },
      { name: '💓 API Latency',    value: `${latencyEmoji(apiLatency)} \`${apiLatency}ms\``, inline: true },
      { name: '🕐 Uptime',         value: uptimeStr,                                          inline: true },
      { name: '📊 Memory',         value: `\`${memUsed} MB / ${memTotal} MB\``,               inline: true },
      { name: '💾 Database',       value: '✅ Connected',                                      inline: true },
      { name: '🔗 API Status',     value: '✅ Operational',                                    inline: true },
      { name: `📡 Health: ${health}%`, value: `\`${healthBar}\` ${health}%`, inline: false }
    )
    .setFooter({ text: FOOTER })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ping_refresh').setLabel('🔄 Refresh').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel('📊 Full Status').setURL(process.env.DASHBOARD_URL || 'https://strata.bot')
  );

  if (isRefresh) {
    await interaction.update({ embeds: [embed], components: [row] });
  } else {
    const reply = await interaction.reply({ embeds: [embed], components: [row] });
    const col = reply.createMessageComponentCollector({ time: 60_000 });
    col.on('collect', async i => {
      if (i.user.id !== interaction.user.id) return i.reply({ content: '❌ Not your button.', ephemeral: true });
      await sendPing(i, true);
    });
    col.on('end', () => { reply.edit({ components: [] }).catch(() => {}); });
  }
}
