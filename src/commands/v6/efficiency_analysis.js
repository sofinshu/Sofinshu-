const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { validatePremiumLicense } = require('../../utils/enhancedPremiumGuard');
const { createEnterpriseEmbed } = require('../../utils/enhancedEmbeds');
const { validatePremiumLicense } = require('../../utils/premium_guard');
const { User, Shift } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('efficiency_analysis')
    .setDescription('Analyze staff efficiency: points per shift hour'),

  async execute(interaction, client) {
    await interaction.deferReply();

            const license = await validatePremiumLicense(interaction, 'enterprise');
            if (!license.allowed) {
                return await interaction.editReply({ embeds: [license.embed], components: [license.components] });
            }
    const guildId = interaction.guildId;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [users, shifts] = await Promise.all([
      User.find({ 'staff.points': { $gt: 0 } }).lean(),
      Shift.find({ guildId, endTime: { $ne: null }, startTime: { $gte: thirtyDaysAgo } }).lean()
    ]);

    if (!users.length) {
      return interaction.editReply('?? No staff data found yet. Staff need to use bot commands first.');
    }

    const shiftMap = {};
    shifts.forEach(s => {
      if (!shiftMap[s.userId]) shiftMap[s.userId] = { totalMin: 0, count: 0 };
      const dur = s.duration || (s.endTime ? (new Date(s.endTime) - new Date(s.startTime)) / 60000 : 0);
      shiftMap[s.userId].totalMin += dur;
      shiftMap[s.userId].count++;
    });

    const efficiencies = users
      .filter(u => u.staff?.points > 0)
      .map(u => {
        const hours = (shiftMap[u.userId]?.totalMin || 0) / 60;
        const pts = u.staff?.points || 0;
        const efficiency = hours > 0 ? (pts / hours).toFixed(2) : pts > 0 ? '8' : '0';
        return { userId: u.userId, username: u.username, pts, hours: hours.toFixed(1), efficiency };
      })
      .sort((a, b) => parseFloat(b.efficiency) - parseFloat(a.efficiency))
      .slice(0, 8);

    const totalShiftHours = Object.values(shiftMap).reduce((s, v) => s + v.totalMin / 60, 0);
    const totalShifts = shifts.length;

    const leaderboard = efficiencies.map((e, i) =>
      `\`${String(i + 1).padStart(2)}\` **${e.username || 'Unknown'}** � ${e.pts} pts / ${e.hours}h = **${e.efficiency} pts/h**`
    ).join('\n') || 'No data available.';

    const embed = createEnterpriseEmbed()
      .setTitle('? Staff Efficiency Analysis')
      
      .addFields(
        { name: '?? Total Shift Hours (30d)', value: totalShiftHours.toFixed(1), inline: true },
        { name: '?? Total Shifts (30d)', value: totalShifts.toString(), inline: true },
        { name: '?? Staff Tracked', value: users.length.toString(), inline: true },
        { name: '?? Efficiency Leaderboard (pts/hour)', value: leaderboard }
      )
      
      ;

    const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_ent_efficiency_analysis').setLabel('�� Sync Enterprise Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [embed], components: [row] });
  }
};





