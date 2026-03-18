const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { Colors, FOOTER, progressBar, streakEmoji } = require('../utils/embeds');
const { getOrCreateStaff, addPoints, calcShiftPoints } = require('../utils/pointsManager');
const { getOrCreateGuild } = require('../utils/permissions');
const Shift = require('../models/Shift');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('shift_end')
    .setDescription('Clock out of current shift and view detailed summary with points earned')
    .addStringOption(o => o.setName('summary').setDescription('What you accomplished this shift').setRequired(false)),

  async execute(interaction) {
    await interaction.deferReply();
    const staffMember = await getOrCreateStaff(interaction.user.id, interaction.guildId, interaction.user.username);
    const guildDoc = await getOrCreateGuild(interaction.guildId, interaction.guild.name);

    if (!staffMember.isOnShift || !staffMember.currentShiftId) {
      const errorEmbed = new EmbedBuilder()
        .setColor(Colors.ERROR)
        .setTitle('❌ NO ACTIVE SHIFT')
        .setDescription('You don\'t have an active shift to end.')
        .setFooter({ text: FOOTER });
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('shift_start_btn').setLabel('⏱️ Start Shift').setStyle(ButtonStyle.Success)
      );
      return interaction.editReply({ embeds: [errorEmbed], components: [row] });
    }

    const shift = await Shift.findById(staffMember.currentShiftId);
    if (!shift) {
      staffMember.isOnShift = false; staffMember.currentShiftId = null;
      await staffMember.save();
      return interaction.editReply({ content: '❌ Shift record not found. Status reset.' });
    }

    // End any active break
    if (shift.activeBreak && shift.breakStartTime) {
      const breakMins = Math.round((Date.now() - shift.breakStartTime) / 60000);
      shift.breaks.push({ startTime: shift.breakStartTime, endTime: new Date(), durationMinutes: breakMins });
      shift.totalBreakMinutes += breakMins;
      shift.activeBreak = false;
    }

    const shiftSummary = interaction.options.getString('summary') || '';
    const clockOut = new Date();
    shift.clockOut = clockOut;
    shift.summary = shiftSummary;
    shift.status = 'completed';
    const totalMins = Math.round((clockOut - shift.clockIn) / 60000);
    const activeMins = Math.max(0, totalMins - shift.totalBreakMinutes);
    shift.durationMinutes = activeMins;

    const pointsEarned = await calcShiftPoints(activeMins, shift.breaks.length > 0);
    shift.pointsEarned = pointsEarned;
    await shift.save();

    // Update staff record
    const goalHours = guildDoc.settings.shiftGoalHours || 40;
    staffMember.isOnShift = false;
    staffMember.currentShiftId = null;
    staffMember.totalShiftMinutes += activeMins;
    staffMember.weeklyShiftMinutes += activeMins;
    staffMember.totalShiftsCompleted += 1;
    staffMember.lastShiftDate = new Date();
    staffMember.lastActiveAt = new Date();

    // Streak logic
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
    if (staffMember.lastShiftDate && staffMember.lastShiftDate >= yesterday) {
      staffMember.shiftStreak = (staffMember.shiftStreak || 0) + 1;
    } else {
      staffMember.shiftStreak = 1;
    }
    if (staffMember.shiftStreak > (staffMember.longestStreak || 0)) staffMember.longestStreak = staffMember.shiftStreak;
    await staffMember.save();

    await addPoints(interaction.user.id, interaction.guildId, pointsEarned, 'shift', `Shift completed (${Math.floor(activeMins/60)}h ${activeMins%60}m)`, 'system');

    const h = Math.floor(activeMins / 60), m = activeMins % 60;
    const bh = Math.floor(shift.totalBreakMinutes / 60), bm = shift.totalBreakMinutes % 60;
    const th = Math.floor(totalMins / 60), tm = totalMins % 60;
    const weeklyPct = Math.min(100, Math.round((staffMember.weeklyShiftMinutes / (goalHours * 60)) * 100));
    const weeklyH = (staffMember.weeklyShiftMinutes / 60).toFixed(1);

    const embed = new EmbedBuilder()
      .setColor(Colors.ERROR)
      .setTitle('⏹️ SHIFT COMPLETED')
      .addFields(
        { name: '👤 Staff Member',   value: `<@${interaction.user.id}>`,                          inline: true },
        { name: '🕐 Clock-In',       value: `<t:${Math.floor(shift.clockIn/1000)}:t>`,            inline: true },
        { name: '🕐 Clock-Out',      value: `<t:${Math.floor(clockOut/1000)}:t>`,                 inline: true },
        { name: '⏱️ Duration',       value: `${th}h ${tm}m total`,                                inline: true },
        { name: '☕ Break Time',     value: `${bh}h ${bm}m (${shift.breaks.length} breaks)`,      inline: true },
        { name: '⚡ Active Time',    value: `${h}h ${m}m`,                                        inline: true },
        { name: '🔥 Weekly Total',   value: `${weeklyH}h / ${goalHours}h goal`,                   inline: true },
        { name: '⭐ Points Earned', value: `+${pointsEarned} points`,                             inline: true },
        { name: '🔥 Streak',         value: `${streakEmoji(staffMember.shiftStreak)} ${staffMember.shiftStreak} days`, inline: true }
      )
      .addFields({ name: `📈 Weekly Progress — ${weeklyPct}%`, value: `\`${progressBar(weeklyPct, 100)}\` ${weeklyPct}%` })
      .setFooter({ text: '💠 Great work! Keep it up 💪' })
      .setTimestamp();

    if (shiftSummary) embed.addFields({ name: '📝 Shift Summary', value: shiftSummary, inline: false });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('shift_new_btn').setLabel('🔄 Start New Shift').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('my_stats_btn').setLabel('📊 My Stats').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel('📋 Full Log').setURL(process.env.DASHBOARD_URL || 'https://strata.bot')
    );

    await interaction.editReply({ embeds: [embed], components: [row] });

    // DM notification
    try {
      const dmEmbed = new EmbedBuilder().setColor(Colors.PRIMARY).setTitle('⏹️ SHIFT LOGGED')
        .setDescription(`Your shift has been logged in **${interaction.guild.name}**:`)
        .addFields(
          { name: '⏱️ Duration',    value: `${h}h ${m}m`,          inline: true },
          { name: '⭐ Points',      value: `+${pointsEarned}`,      inline: true },
          { name: '💰 New Balance', value: `${(staffMember.points || 0).toLocaleString()} points`, inline: true }
        ).setFooter({ text: FOOTER });
      await interaction.user.send({ embeds: [dmEmbed] });
    } catch {}
  }
};
