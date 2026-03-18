const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const { Colors, FOOTER } = require('../utils/embeds');
const { getOrCreateGuild } = require('../utils/permissions');
const Staff = require('../models/Staff');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('staff_rank')
    .setDescription('Display complete rank hierarchy showing all ranks and their member counts')
    .addStringOption(o => o.setName('rank').setDescription('View members for a specific rank').setRequired(false)),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const guildDoc = await getOrCreateGuild(interaction.guildId, interaction.guild.name);
    const specificRank = interaction.options.getString('rank');
    const allStaff = await Staff.find({ guildId: interaction.guildId, isActive: true });

    if (specificRank) return showRankMembers(interaction, specificRank, allStaff);

    const ranks = guildDoc.ranks.sort((a, b) => a.position - b.position);
    const defaultRanks = ranks.length > 0 ? ranks : [
      { name: 'Owner', color: '#FF6B6B', requiredPoints: 0, position: 1 },
      { name: 'Admin', color: '#9B59B6', requiredPoints: 50000, position: 2 },
      { name: 'Head Moderator', color: '#3498DB', requiredPoints: 25000, position: 3 },
      { name: 'Senior Moderator', color: '#2ECC71', requiredPoints: 10000, position: 4 },
      { name: 'Junior Moderator', color: '#F1C40F', requiredPoints: 2500, position: 5 },
      { name: 'Trial Moderator', color: '#95A5A6', requiredPoints: 0, position: 6 }
    ];

    const rankLines = defaultRanks.map((r, i) => {
      const count = allStaff.filter(s => s.rank?.toLowerCase() === r.name.toLowerCase()).length;
      const entry = `**${r.name}**\nMembers: ${count}  •  Required Points: ${r.requiredPoints?.toLocaleString() || 'N/A'}`;
      return (i < defaultRanks.length - 1) ? entry + '\n                    ⬇️' : entry;
    }).join('\n');

    const embed = new EmbedBuilder()
      .setColor(Colors.PRIMARY)
      .setTitle(`🏅 RANK HIERARCHY — ${interaction.guild.name}`)
      .setDescription(rankLines)
      .setFooter({ text: `${allStaff.length} staff across ${defaultRanks.length} ranks • ${FOOTER}` })
      .setTimestamp();

    const menuOptions = defaultRanks.map(r => ({
      label: r.name,
      description: `${allStaff.filter(s => s.rank?.toLowerCase() === r.name.toLowerCase()).length} members`,
      value: r.name
    }));

    const selectRow = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('rank_select')
        .setPlaceholder('🏅 Select a rank to view members...')
        .addOptions(menuOptions.slice(0, 25))
    );
    const btnRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel('⚙️ Configure Ranks').setURL(process.env.DASHBOARD_URL || 'https://strata.bot'),
      new ButtonBuilder().setCustomId('rank_refresh').setLabel('🔄 Refresh').setStyle(ButtonStyle.Secondary)
    );

    const msg = await interaction.editReply({ embeds: [embed], components: [selectRow, btnRow] });
    const col = msg.createMessageComponentCollector({ time: 120_000 });
    col.on('collect', async i => {
      if (i.user.id !== interaction.user.id) return i.reply({ content: '❌ Not yours.', ephemeral: true });
      if (i.customId === 'rank_select') return showRankMembersUpdate(i, i.values[0], allStaff);
      if (i.customId === 'rank_refresh') return i.deferUpdate();
    });
    col.on('end', () => { interaction.editReply({ components: [] }).catch(() => {}); });
  }
};

async function showRankMembers(interaction, rankName, allStaff) {
  const members = allStaff.filter(s => s.rank?.toLowerCase() === rankName.toLowerCase());
  const list = members.slice(0, 15).map(s => `• **${s.username}** — ⭐ ${s.points.toLocaleString()} pts`).join('\n');
  const embed = new EmbedBuilder().setColor(Colors.PRIMARY).setTitle(`🔰 ${rankName} — ${members.length} Members`)
    .setDescription(list || 'No members at this rank.').setFooter({ text: FOOTER });
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('rank_back').setLabel('🔙 View All Ranks').setStyle(ButtonStyle.Secondary)
  );
  await interaction.editReply({ embeds: [embed], components: [row] });
}

async function showRankMembersUpdate(interaction, rankName, allStaff) {
  const members = allStaff.filter(s => s.rank?.toLowerCase() === rankName.toLowerCase());
  const list = members.slice(0, 15).map(s => `• **${s.username}** — ⭐ ${s.points.toLocaleString()} pts`).join('\n');
  const embed = new EmbedBuilder().setColor(Colors.PRIMARY).setTitle(`🔰 ${rankName} — ${members.length} Members`)
    .setDescription(list || 'No members at this rank.').setFooter({ text: FOOTER });
  await interaction.update({ embeds: [embed], components: [] });
}
