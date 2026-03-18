const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { Colors, FOOTER, progressBar, streakEmoji } = require('../utils/embeds');
const { getOrCreateStaff, addPoints, calcShiftPoints } = require('../utils/pointsManager');
const { getOrCreateGuild } = require('../utils/permissions');
const Shift = require('../models/Shift');
const Staff = require('../models/Staff');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('shift_start')
    .setDescription('Clock into a shift with role tagging notes and automatic progress tracking')
    .addStringOption(o => o.setName('role').setDescription('Your shift role/position').setRequired(false))
    .addStringOption(o => o.setName('notes').setDescription('Shift goals or notes').setRequired(false)),

  async execute(interaction) {
    await interaction.deferReply();
    const guildDoc = await getOrCreateGuild(interaction.guildId, interaction.guild.name);
    const staffMember = await getOrCreateStaff(interaction.user.id, interaction.guildId, interaction.user.username);

    // Check for active shift
    if (staffMember.isOnShift && staffMember.currentShiftId) {
      const activeShift = await Shift.findById(staffMember.currentShiftId);
      if (activeShift) {
        const mins = Math.round((Date.now() - activeShift.clockIn) / 60000);
        const h = Math.floor(mins / 60), m = mins % 60;
        const errorEmbed = new EmbedBuilder()
          .setColor(Colors.ERROR)
          .setTitle('❌ ALREADY CLOCKED IN')
          .setDescription('You\'re already on shift!')
          .addFields(
            { name: '⏱️ Shift Started', value: `<t:${Math.floor(activeShift.clockIn/1000)}:F>`, inline: true },
            { name: '🕐 Duration',      value: `${h}h ${m}m`,                                   inline: true },
            { name: '🏷️ Role',          value: activeShift.role || 'Staff',                       inline: true }
          )
          .setFooter({ text: FOOTER });
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('shift_end_quick').setLabel('🛑 End Current Shift').setStyle(ButtonStyle.Danger)
        );
        return interaction.editReply({ embeds: [errorEmbed], components: [row] });
      }
    }

    const role = interaction.options.getString('role') || 'Staff';
    const notes = interaction.options.getString('notes') || '';
    const goalHours = guildDoc.settings.shiftGoalHours || 40;
    const shiftNumber = staffMember.totalShiftsCompleted + 1;
    const weeklyHours = (staffMember.weeklyShiftMinutes / 60).toFixed(1);
    const weeklyPct = Math.min(100, Math.round((staffMember.weeklyShiftMinutes / (goalHours * 60)) * 100));

    const shift = await Shift.create({
      userId: interaction.user.id,
      guildId: interaction.guildId,
      role, notes,
      clockIn: new Date(),
      shiftNumber,
      status: 'active'
    });

    staffMember.isOnShift = true;
    staffMember.currentShiftId = shift._id;
    await staffMember.save();

    const embed = new EmbedBuilder()
      .setColor(Colors.SUCCESS)
      .setTitle('⏱️ SHIFT STARTED')
      .setDescription(`<@${interaction.user.id}> has clocked in!`)
      .addFields(
        { name: '👤 Staff Member',  value: `<@${interaction.user.id}>`,                       inline: true },
        { name: '🏷️ Role/Position', value: role,                                              inline: true },
        { name: '🕐 Clock-In Time', value: `<t:${Math.floor(Date.now()/1000)}:F>`,           inline: true },
        { name: '📊 Shift #',       value: `Shift #${shiftNumber} today`,                    inline: true },
        { name: '🔥 Weekly Hours',  value: `${weeklyHours}h / ${goalHours}h goal`,           inline: true },
        { name: '🔥 Streak',        value: `${streakEmoji(staffMember.shiftStreak)} ${staffMember.shiftStreak} days`, inline: true }
      )
      .addFields({ name: `📈 Weekly Progress — ${weeklyPct}%`, value: `\`${progressBar(weeklyPct, 100)}\` ${weeklyPct}%` })
      .setFooter({ text: '💠 Use /shift_end when you\'re done • Break time is tracked' })
      .setTimestamp();

    if (notes) embed.addFields({ name: '📝 Notes', value: notes, inline: false });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('shift_end_btn').setLabel('🛑 End Shift').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId(`break_start_${shift._id}`).setLabel('☕ Start Break').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('my_shifts_btn').setLabel('📋 My Shifts').setStyle(ButtonStyle.Secondary)
    );

    const msg = await interaction.editReply({ embeds: [embed], components: [row] });
    const col = msg.createMessageComponentCollector({ time: 3600_000 }); // 1 hour

    col.on('collect', async i => {
      if (i.user.id !== interaction.user.id) return i.reply({ content: '❌ Not yours.', ephemeral: true });
      if (i.customId.startsWith('break_start_')) return handleBreak(i, shift, row);
      if (i.customId === 'shift_end_btn' || i.customId === 'shift_end_quick') {
        col.stop();
        await i.reply({ content: '✅ Use `/shift_end` to clock out properly and receive your shift summary!', ephemeral: true });
      }
    });
  }
};

async function handleBreak(interaction, shift, originalRow) {
  shift.activeBreak = true;
  shift.breakStartTime = new Date();
  await shift.save();
  const newRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('shift_end_btn').setLabel('🛑 End Shift').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`break_end_${shift._id}`).setLabel('☕ End Break').setStyle(ButtonStyle.Primary)
  );
  await interaction.update({ components: [newRow] });
}
