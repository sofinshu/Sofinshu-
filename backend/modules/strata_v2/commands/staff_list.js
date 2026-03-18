const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { Colors, FOOTER } = require('../utils/embeds');
const { getOrCreateGuild } = require('../utils/permissions');
const Staff = require('../models/Staff');
const Shift = require('../models/Shift');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('staff_list')
    .setDescription('View paginated list of all staff members with ranks online status and points')
    .addStringOption(o => o.setName('rank').setDescription('Filter by rank').setRequired(false))
    .addStringOption(o => o.setName('status').setDescription('Filter by status').setRequired(false)
      .addChoices({ name: 'All', value: 'all' }, { name: 'On Shift', value: 'on_shift' })),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const rankFilter = interaction.options.getString('rank');
    const statusFilter = interaction.options.getString('status') || 'all';

    let members = await Staff.find({ guildId: interaction.guildId, isActive: true }).sort({ points: -1 });
    if (rankFilter) members = members.filter(m => m.rank?.toLowerCase().includes(rankFilter.toLowerCase()));
    if (statusFilter === 'on_shift') members = members.filter(m => m.isOnShift);

    await sendList(interaction, members, 0, statusFilter, rankFilter);
  }
};

async function sendList(interaction, members, page, statusFilter, rankFilter) {
  const PAGE_SIZE = 7;
  const totalPages = Math.max(1, Math.ceil(members.length / PAGE_SIZE));
  const slice = members.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const activeShifts = await Shift.find({ guildId: interaction.guildId, status: 'active' });
  const shiftMap = new Map(activeShifts.map(s => [s.userId, s]));

  const lines = slice.map(s => {
    const shiftData = shiftMap.get(s.userId);
    let statusIcon = '🔴';
    let statusText = 'Offline';
    if (shiftData) {
      const mins = Math.round((Date.now() - shiftData.clockIn) / 60000);
      statusIcon = '⏱️';
      statusText = `On Shift (${formatDur(mins)})`;
    }
    return `${statusIcon} **${s.username || 'Unknown'}**\n> 🏷️ ${s.rank || 'No Rank'} • ⭐ ${s.points.toLocaleString()} pts • ${statusText}`;
  }).join('\n\n');

  const embed = new EmbedBuilder()
    .setColor(Colors.PRIMARY)
    .setTitle(`👥 STAFF DIRECTORY — ${interaction.guild.name}`)
    .setDescription(
      `Showing **${members.length}** staff members${rankFilter ? ` (Rank: ${rankFilter})` : ''} • ${statusFilter}\n\n` +
      (lines || '*No staff members found.*')
    )
    .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
    .setFooter({ text: `Page ${page + 1}/${totalPages} • ${members.length} total • ${FOOTER}` })
    .setTimestamp();

  const navRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`sl_prev_${page}`).setLabel('◀️ Prev').setStyle(ButtonStyle.Secondary).setDisabled(page === 0),
    new ButtonBuilder().setCustomId('sl_pg').setLabel(`${page + 1}/${totalPages}`).setStyle(ButtonStyle.Secondary).setDisabled(true),
    new ButtonBuilder().setCustomId(`sl_next_${page}`).setLabel('Next ▶️').setStyle(ButtonStyle.Secondary).setDisabled(page >= totalPages - 1)
  );

  const actRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('sl_search').setLabel('🔍 Search').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel('📊 Full Directory').setURL(process.env.DASHBOARD_URL || 'https://strata.bot')
  );

  const opts = { embeds: [embed], components: [navRow, actRow] };
  const msg = await interaction.editReply(opts);

  const col = msg.createMessageComponentCollector({ time: 180_000 });
  col.on('collect', async i => {
    if (i.user.id !== interaction.user.id) return i.reply({ content: '❌ Not yours.', ephemeral: true });
    if (i.customId.startsWith('sl_prev_')) return sendListUpdate(i, members, page - 1, statusFilter, rankFilter);
    if (i.customId.startsWith('sl_next_')) return sendListUpdate(i, members, page + 1, statusFilter, rankFilter);
    if (i.customId === 'sl_search') {
      const modal = new ModalBuilder().setCustomId('sl_search_modal').setTitle('Search Staff');
      modal.addComponents(new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('query').setLabel('Staff Name').setStyle(TextInputStyle.Short).setPlaceholder('Enter name...').setRequired(true)
      ));
      await i.showModal(modal);
    }
  });
  col.on('end', () => { interaction.editReply({ components: [] }).catch(() => {}); });
}

async function sendListUpdate(interaction, members, page, statusFilter, rankFilter) {
  const PAGE_SIZE = 7;
  const totalPages = Math.max(1, Math.ceil(members.length / PAGE_SIZE));
  page = Math.max(0, Math.min(page, totalPages - 1));
  const slice = members.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const activeShifts = await Shift.find({ guildId: interaction.guildId, status: 'active' });
  const shiftMap = new Map(activeShifts.map(s => [s.userId, s]));

  const lines = slice.map(s => {
    const shiftData = shiftMap.get(s.userId);
    let statusIcon = '🔴', statusText = 'Offline';
    if (shiftData) { statusIcon = '⏱️'; statusText = `On Shift`; }
    return `${statusIcon} **${s.username || 'Unknown'}**\n> 🏷️ ${s.rank || 'No Rank'} • ⭐ ${s.points.toLocaleString()} pts • ${statusText}`;
  }).join('\n\n');

  const embed = new EmbedBuilder().setColor(Colors.PRIMARY).setTitle(`👥 STAFF DIRECTORY — ${interaction.guild.name}`)
    .setDescription(`Showing **${members.length}** staff members\n\n` + (lines || '*No staff members found.*'))
    .setFooter({ text: `Page ${page + 1}/${totalPages} • ${members.length} total • ${FOOTER}` }).setTimestamp();

  const navRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`sl_prev_${page}`).setLabel('◀️ Prev').setStyle(ButtonStyle.Secondary).setDisabled(page === 0),
    new ButtonBuilder().setCustomId('sl_pg').setLabel(`${page + 1}/${totalPages}`).setStyle(ButtonStyle.Secondary).setDisabled(true),
    new ButtonBuilder().setCustomId(`sl_next_${page}`).setLabel('Next ▶️').setStyle(ButtonStyle.Secondary).setDisabled(page >= totalPages - 1)
  );
  const actRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('sl_search').setLabel('🔍 Search').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel('📊 Full Directory').setURL(process.env.DASHBOARD_URL || 'https://strata.bot')
  );
  await interaction.update({ embeds: [embed], components: [navRow, actRow] });
}

function formatDur(mins) {
  const h = Math.floor(mins / 60), m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
