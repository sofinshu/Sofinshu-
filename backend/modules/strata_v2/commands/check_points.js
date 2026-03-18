const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { Colors, FOOTER } = require('../utils/embeds');
const { getOrCreateStaff, addPoints, removePoints, getPointsRank } = require('../utils/pointsManager');
const { getOrCreateGuild, isManager } = require('../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('check_points')
    .setDescription('Quickly check a staff member point balance rank and milestone progress')
    .addUserOption(o => o.setName('user').setDescription('Staff member to check').setRequired(true)),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const target = interaction.options.getUser('user');
    const guildDoc = await getOrCreateGuild(interaction.guildId, interaction.guild.name);
    const staffMember = await getOrCreateStaff(target.id, interaction.guildId, target.username);
    const { rank, total } = await getPointsRank(target.id, interaction.guildId);
    const canManage = await isManager(interaction.member, guildDoc);

    const next = [1000, 2500, 5000, 10000, 25000, 50000, 100000].find(m => m > staffMember.points) || staffMember.points;

    const embed = new EmbedBuilder()
      .setColor(Colors.GOLD)
      .setTitle('⭐ QUICK POINT CHECK')
      .setDescription(`<@${target.id}> has **${staffMember.points.toLocaleString()}** points (Ranked #${rank || 'N/A'} of ${total})`)
      .addFields(
        { name: '📈 Weekly Change',  value: `+${staffMember.weeklyPoints.toLocaleString()}`,                    inline: true },
        { name: '🎯 Next Milestone', value: `${next.toLocaleString()} pts — ${(next - staffMember.points).toLocaleString()} away`, inline: true },
        { name: '🔥 Streak',        value: `${staffMember.shiftStreak} days`,                                  inline: true }
      )
      .setFooter({ text: `Use /points for full breakdown • ${FOOTER}` })
      .setTimestamp();

    const buttons = [
      new ButtonBuilder().setCustomId(`cp_profile_${target.id}`).setLabel('👤 Full Profile').setStyle(ButtonStyle.Secondary)
    ];
    if (canManage) {
      buttons.push(
        new ButtonBuilder().setCustomId(`cp_add_${target.id}`).setLabel('⭐ Add Points').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`cp_remove_${target.id}`).setLabel('➖ Remove Points').setStyle(ButtonStyle.Danger)
      );
    }
    const row = new ActionRowBuilder().addComponents(buttons);
    const msg = await interaction.editReply({ embeds: [embed], components: [row] });

    const col = msg.createMessageComponentCollector({ time: 60_000 });
    col.on('collect', async i => {
      if (i.user.id !== interaction.user.id) return i.reply({ content: '❌ Not yours.', ephemeral: true });
      if (i.customId.startsWith('cp_add_')) return showPointsModal(i, 'add', target);
      if (i.customId.startsWith('cp_remove_')) return showPointsModal(i, 'remove', target);
    });
    col.on('end', () => { interaction.editReply({ components: [] }).catch(() => {}); });
  },

  // Called from interactionCreate for modal submissions
  async handleAddModal(interaction, target) {
    const amount = parseInt(interaction.fields.getTextInputValue('amount'));
    const reason = interaction.fields.getTextInputValue('reason');
    if (isNaN(amount) || amount <= 0) return interaction.reply({ content: '❌ Invalid amount.', ephemeral: true });
    const updated = await addPoints(target.id, interaction.guildId, amount, 'manual_add', reason, interaction.user.id);
    const embed = new EmbedBuilder().setColor(Colors.SUCCESS).setTitle('✅ POINTS ADDED')
      .setDescription(`**+${amount}** points added to <@${target.id}>\n**New Balance:** ${updated.points.toLocaleString()} points\n**Reason:** ${reason}`)
      .setFooter({ text: FOOTER });
    await interaction.reply({ embeds: [embed], ephemeral: true });
  },

  async handleRemoveModal(interaction, target) {
    const amount = parseInt(interaction.fields.getTextInputValue('amount'));
    const reason = interaction.fields.getTextInputValue('reason');
    if (isNaN(amount) || amount <= 0) return interaction.reply({ content: '❌ Invalid amount.', ephemeral: true });
    const updated = await removePoints(target.id, interaction.guildId, amount, 'manual_remove', reason, interaction.user.id);
    const embed = new EmbedBuilder().setColor(Colors.ERROR).setTitle('✅ POINTS REMOVED')
      .setDescription(`**-${amount}** points removed from <@${target.id}>\n**New Balance:** ${updated?.points.toLocaleString() || 0} points\n**Reason:** ${reason}`)
      .setFooter({ text: FOOTER });
    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};

async function showPointsModal(interaction, type, target) {
  const modal = new ModalBuilder()
    .setCustomId(`points_${type}_modal_${target.id}`)
    .setTitle(`${type === 'add' ? 'Add' : 'Remove'} Points ${type === 'add' ? 'to' : 'from'} @${target.username}`);
  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('amount').setLabel('Amount').setStyle(TextInputStyle.Short)
        .setPlaceholder(`Enter amount to ${type === 'add' ? 'add' : 'remove'} (e.g., 100)`).setRequired(true).setMinLength(1).setMaxLength(8)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('reason').setLabel('Reason').setStyle(TextInputStyle.Short)
        .setPlaceholder('Reason for this adjustment').setRequired(true).setMaxLength(200)
    )
  );
  await interaction.showModal(modal);
}
