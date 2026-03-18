const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { Colors, FOOTER, severityColor } = require('../utils/embeds');
const { getOrCreateGuild, isManager } = require('../utils/permissions');
const Warning = require('../models/Warning');
const Staff = require('../models/Staff');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('View comprehensive warning history for a staff member with status filters')
    .addUserOption(o => o.setName('user').setDescription('Staff member to view').setRequired(true))
    .addStringOption(o => o.setName('status').setDescription('Filter warnings').setRequired(false)
      .addChoices({ name: 'All', value: 'all' }, { name: 'Active Only', value: 'active' }, { name: 'Expired Only', value: 'expired' })),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const target = interaction.options.getUser('user');
    const statusFilter = interaction.options.getString('status') || 'all';
    await sendWarnings(interaction, target, statusFilter, 0, false);
  }
};

async function sendWarnings(interaction, target, statusFilter, page, isUpdate) {
  const guildDoc = await interaction.client.guilds.cache.get(interaction.guildId);
  const canManage = interaction.member?.permissions.has('Administrator') || false;

  const query = { userId: target.id, guildId: interaction.guildId };
  if (statusFilter === 'active') query.active = true;
  if (statusFilter === 'expired') query.active = false;

  const allWarnings = await Warning.find(query).sort({ issuedAt: -1 });
  const activeCount = await Warning.countDocuments({ userId: target.id, guildId: interaction.guildId, active: true });

  const PAGE_SIZE = 5;
  const totalPages = Math.max(1, Math.ceil(allWarnings.length / PAGE_SIZE));
  page = Math.max(0, Math.min(page, totalPages - 1));
  const slice = allWarnings.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const severityEmoji = { minor: '🟢', moderate: '🟡', major: '🔴', critical: '🔴' };

  const warnLines = slice.map(w => {
    const status = w.active ? `🔴 Active (expires <t:${Math.floor(w.expiresAt/1000)}:R>)` : '🟢 Expired';
    return `**${w.warningId}** — ${severityEmoji[w.severity]} ${w.severity.charAt(0).toUpperCase() + w.severity.slice(1)}\n> ${w.reason.substring(0, 80)}\n> Issued by <@${w.issuedBy}> • <t:${Math.floor(w.issuedAt/1000)}:D>\n> ${status} • Points: -${w.pointsDeducted}`;
  }).join('\n\n');

  const statusLabel = activeCount >= 3 ? '⚠️ At risk of escalation' : activeCount > 0 ? '🟡 Has warnings' : '🟢 Clear';

  const embed = new EmbedBuilder()
    .setColor(activeCount >= 3 ? Colors.ERROR : activeCount > 0 ? Colors.WARNING : Colors.SUCCESS)
    .setTitle(`⚠️ WARNING HISTORY — @${target.username}`)
    .setDescription(`**${allWarnings.length}** total warnings (${activeCount} active)\nStatus: ${statusLabel}`)
    .setThumbnail(target.displayAvatarURL({ dynamic: true }))
    .addFields({ name: `Warnings (Page ${page + 1}/${totalPages})`, value: warnLines || '*No warnings found.*', inline: false })
    .setFooter({ text: FOOTER })
    .setTimestamp();

  const navRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`wn_prev_${page}_${statusFilter}`).setLabel('◀️ Prev').setStyle(ButtonStyle.Secondary).setDisabled(page === 0),
    new ButtonBuilder().setCustomId('wn_pg').setLabel(`${page + 1}/${totalPages}`).setStyle(ButtonStyle.Secondary).setDisabled(true),
    new ButtonBuilder().setCustomId(`wn_next_${page}_${statusFilter}`).setLabel('Next ▶️').setStyle(ButtonStyle.Secondary).setDisabled(page >= totalPages - 1)
  );
  const filterRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`wn_f_active`).setLabel('🔴 Active').setStyle(statusFilter === 'active' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`wn_f_expired`).setLabel('🟢 Expired').setStyle(statusFilter === 'expired' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`wn_f_all`).setLabel('📋 All').setStyle(statusFilter === 'all' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel('📋 Full Log').setURL(process.env.DASHBOARD_URL || 'https://strata.bot')
  );

  const components = [navRow, filterRow];

  const opts = { embeds: [embed], components };
  const msg = isUpdate ? await interaction.update(opts) : await interaction.editReply(opts);

  if (!isUpdate) {
    const reply = await interaction.fetchReply();
    const col = reply.createMessageComponentCollector({ time: 180_000 });
    col.on('collect', async i => {
      if (i.user.id !== interaction.user.id) return i.reply({ content: '❌ Not yours.', ephemeral: true });
      if (i.customId.startsWith('wn_prev_')) {
        const [, , pg, sf] = i.customId.split('_');
        return sendWarnings(i, target, sf, parseInt(pg) - 1, true);
      }
      if (i.customId.startsWith('wn_next_')) {
        const [, , pg, sf] = i.customId.split('_');
        return sendWarnings(i, target, sf, parseInt(pg) + 1, true);
      }
      if (i.customId.startsWith('wn_f_')) {
        const filter = i.customId.replace('wn_f_', '');
        return sendWarnings(i, target, filter, 0, true);
      }
    });
    col.on('end', () => { interaction.editReply({ components: [] }).catch(() => {}); });
  }
}
