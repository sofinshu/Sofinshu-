const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { validatePremiumLicense } = require('../../utils/enhancedPremiumGuard');
const { validatePremiumLicense } = require('../../utils/enhancedPremiumGuard');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/enhancedEmbeds');
const { Activity, Shift, User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('progress_report')
    .setDescription('Enterprise Hyper-Apex: 7-Day Macroscopic Operational Yield'),

  async execute(interaction) {
    try {
      await interaction.deferReply();
      const targetUser = interaction.options.getUser('user') || interaction.user;
      const guildId = interaction.guildId;

      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const [userData, recentShifts, recentActivities] = await Promise.all([
        User.findOne({ userId: targetUser.id, guildId: guildId }).lean(),
        Shift.find({ userId: targetUser.id, guildId: guildId, createdAt: { $gte: sevenDaysAgo } }).lean(),
        Activity.find({ userId: targetUser.id, guildId: guildId, createdAt: { $gte: sevenDaysAgo } }).lean()
      ]);

      if (!userData || !userData.staff) {
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_btn_progress_report').setLabel('� Sync Live Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [createErrorEmbed(`No telemetry found for <@${targetUser.id}>.`)], components: [row] });
      }

      const ptsGainedLast7Days = recentActivities.reduce((sum, act) => sum + (act.points || 0), 0);
      const commandTasks = recentActivities.length;

      const momentum = ptsGainedLast7Days > 500 ? '?? HIGH VELOCITY' : ptsGainedLast7Days > 100 ? '?? STABLE' : '?? LIMITED';

      // Metabolic Pulse ASCII (Heartbeat)
      const pulseSegments = 15;
      const pulseFilled = '�'.repeat(Math.min(pulseSegments, Math.max(1, Math.round(ptsGainedLast7Days / 100))));
      const pulseEmpty = '�'.repeat(pulseSegments - pulseFilled.length);
      const metabolicPulse = `\`[${pulseFilled}${pulseEmpty}]\` **${momentum}**`;

      const embed = await createCustomEmbed(interaction, {
        title: `?? Enterprise Hyper-Apex: Operational Yield`,
        thumbnail: targetUser.displayAvatarURL({ dynamic: true }),
        description: `### ??? 7-Day Performance Analytic\nComprehensive yield for **${targetUser.username}** in the **${interaction.guild.name}** sector. Metabolic pulse synchronization active.\n\n**?? Enterprise HYPER-APEX EXCLUSIVE**`,
        fields: [
          { name: '? Metabolic Pulse', value: metabolicPulse, inline: false },
          { name: '? Command Throughput', value: `\`${commandTasks.toLocaleString()}\` signals`, inline: true },
          { name: '?? Service Engagement', value: `\`${recentShifts.length.toLocaleString()}\` shifts`, inline: true },
          { name: '? Strategic Yield', value: `\`+${ptsGainedLast7Days.toLocaleString()}\` merit`, inline: true },
          { name: '? Pulse Resonance', value: '`?? OPTIMAL`', inline: true },
          { name: '?? Global Benchmark', value: '`?? ELITE PERFORMANCE`', inline: true }
        ],
        footer: 'Reports generated from 7d macroscopic telemetry � V2 Expansion Hyper-Apex',
        color: 'premium'
      });

      const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_btn_progress_report').setLabel('� Sync Live Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [embed], components: [row] });

    } catch (error) {
      console.error('Progress Report Error:', error);
      const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_btn_progress_report').setLabel('� Sync Live Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [createErrorEmbed('Yield failure: Unable to synchronize macroscopic performance report.')], components: [row] });
    }
  }
};


