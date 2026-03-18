const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { Colors, FOOTER } = require('../utils/embeds');
const { getOrCreateGuild, isManager } = require('../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('set_rank_roles')
    .setDescription('Configure Discord role IDs for each staff rank level in hierarchy')
    .addStringOption(o => o.setName('rank_name').setDescription('Name of the rank (e.g. Senior Moderator)').setRequired(true))
    .addRoleOption(o => o.setName('role').setDescription('Discord role for this rank').setRequired(true))
    .addIntegerOption(o => o.setName('position').setDescription('Rank position (1=highest)').setRequired(false).setMinValue(1).setMaxValue(50))
    .addIntegerOption(o => o.setName('required_points').setDescription('Points required for this rank').setRequired(false).setMinValue(0))
    .addStringOption(o => o.setName('color').setDescription('Embed color hex (e.g. #FF6B6B)').setRequired(false)),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const guild = await getOrCreateGuild(interaction.guildId, interaction.guild.name);

    if (!await isManager(interaction.member, guild)) {
      return interaction.editReply({ embeds: [{
        color: Colors.ERROR, title: '🔒 Insufficient Permissions',
        description: 'You need a manager role to configure rank roles.'
      }]});
    }

    const rankName = interaction.options.getString('rank_name');
    const role = interaction.options.getRole('role');
    const position = interaction.options.getInteger('position') || guild.ranks.length + 1;
    const requiredPoints = interaction.options.getInteger('required_points') || 0;
    const color = interaction.options.getString('color') || '#5865F2';

    const existingRank = guild.ranks.findIndex(r => r.name.toLowerCase() === rankName.toLowerCase());
    if (existingRank !== -1) {
      guild.ranks[existingRank] = { name: rankName, roleId: role.id, color, position, requiredPoints };
    } else {
      guild.ranks.push({ name: rankName, roleId: role.id, color, position, requiredPoints });
    }
    guild.ranks.sort((a, b) => a.position - b.position);
    await guild.save();

    const embed = new EmbedBuilder()
      .setColor(Colors.SUCCESS)
      .setTitle('✅ RANK ROLE CONFIGURED')
      .addFields(
        { name: '🏷️ Rank Name',      value: rankName,                inline: true },
        { name: '🔰 Discord Role',   value: `<@&${role.id}>`,        inline: true },
        { name: '📊 Position',       value: `#${position}`,          inline: true },
        { name: '⭐ Required Points', value: requiredPoints.toString(), inline: true },
        { name: '🎨 Color',          value: color,                   inline: true },
        { name: '📋 Total Ranks',    value: guild.ranks.length.toString(), inline: true }
      )
      .setFooter({ text: FOOTER })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
};
