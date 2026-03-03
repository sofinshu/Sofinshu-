const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { validatePremiumLicense } = require('../../utils/enhancedPremiumGuard');
const { createCustomEmbed, createErrorEmbed, createPremiumEmbed, createSuccessEmbed } = require('../../utils/enhancedEmbeds');
const { Activity, User } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('staff_behavior')
    .setDescription('Enterprise Apex: AI Reliability Scoring & Personnel Stability Matrix')
    .addUserOption(opt => opt.setName('user').setDescription('Staff member to analyze').setRequired(false)),

  async execute(interaction) {
    try {
      await interaction.deferReply();

      // Enterprise License Guard
      const license = await validatePremiumLicense(interaction, 'premium');
      if (!license.allowed) {
        return await interaction.editReply({ embeds: [license.embed], components: license.components });
      }

      const guildId = interaction.guildId;
      const targetUser = interaction.options.getUser('user') || interaction.user;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      const [activities, user] = await Promise.all([
        Activity.find({ guildId, userId: targetUser.id, createdAt: { $gte: startDate } }).lean(),
        User.findOne({ userId: targetUser.id, guildId }).lean()
      ]);

      if (!user || !user.staff) {
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_v5_staff_behavior').setLabel('� Sync Live Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [createErrorEmbed(`No behavioral trace found. <@${targetUser.id}> is unmapped.`)], components: [row] });
      }

      const warnings = activities.filter(a => a.type === 'warning').length;
      const shifts = activities.filter(a => a.type === 'shift').length;
      const commands = activities.filter(a => a.type === 'command').length;

      // Enterprise AI Reliability Logic
      const baseReliability = 100;
      const penalty = (warnings * 15);
      const bonus = Math.min(20, (shifts * 2) + (commands * 0.1));
      const reliabilityScore = Math.min(100, Math.max(0, baseReliability - penalty + bonus));

      // Reliability Bar
      const barLength = 15;
      const filled = '�'.repeat(Math.round((reliabilityScore / 100) * barLength));
      const empty = '�'.repeat(barLength - filled.length);
      const reliabilityViz = `\`[${filled}${empty}]\` **${reliabilityScore.toFixed(1)}% STABILITY**`;

      const embed = await createCustomEmbed(interaction, {
        title: `?? Enterprise AI Behavioral Audit: ${targetUser.username}`,
        thumbnail: targetUser.displayAvatarURL({ dynamic: true }),
        description: `### ??? Personnel Stability Orchestration\nMacroscopic behavioral analysis conducted over a **30-day** period in sector **${interaction.guild.name}**. Cross-referencing risk factors vs performance metabolism.\n\n**?? Enterprise APEX EXCLUSIVE**`,
        fields: [
          { name: '?? AI Reliability Score', value: reliabilityViz, inline: false },
          { name: '?? Security Incidents', value: `\`${warnings}\` Flags`, inline: true },
          { name: '?? Operational Shifting', value: `\`${shifts}\` Cycles`, inline: true },
          { name: '? Command Precision', value: `\`${commands}\` Pings`, inline: true },
          { name: '??? Status Rating', value: reliabilityScore > 80 ? '`S-RANK STABLE`' : (reliabilityScore > 50 ? '`B-RANK NOMINAL`' : '`F-RANK CRITICAL`'), inline: true },
          { name: '?? Trajectory', value: reliabilityScore > 70 ? '`UPWARD`' : '`DECAYING`', inline: true }
        ],
        footer: 'AI Behavioral Modeling � V5 Executive Apex Suite',
        color: reliabilityScore > 75 ? 'success' : 'premium'
      });

      const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_v5_staff_behavior').setLabel('� Sync Live Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [embed], components: [row] });

    } catch (error) {
      console.error('Enterprise Staff Behavior Error:', error);
      const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_v5_staff_behavior').setLabel('� Sync Live Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [createErrorEmbed('Behavioral Intelligence failure: Unable to compute reliability matrices.')], components: [row] });
    }
  }
};


