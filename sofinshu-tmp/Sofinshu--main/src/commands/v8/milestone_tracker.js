const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { validatePremiumLicense } = require('../../utils/enhancedPremiumGuard');
const { createEnterpriseEmbed, createErrorEmbed, createSuccessEmbed } = require('../../utils/enhancedEmbeds');
const { Guild } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('milestone_tracker')
    .setDescription('Track all server milestones with visual progress'),

  async execute(interaction, client) {
    await interaction.deferReply();

            const license = await validatePremiumLicense(interaction, 'enterprise');
            if (!license.allowed) {
                return await interaction.editReply({ embeds: [license.embed], components: [license.components] });
            }
    const guildId = interaction.guildId;
    const guild = await Guild.findOne({ guildId }).lean();
    const memberCount = interaction.guild.memberCount;
    const cmds = guild?.stats?.commandsUsed || 0;
    const warnings = guild?.stats?.warnings || 0;
    const messages = guild?.stats?.messagesProcessed || 0;

    const milestones = [
      { label: '?? Members: 50', val: memberCount, target: 50 },
      { label: '?? Members: 100', val: memberCount, target: 100 },
      { label: '?? Members: 500', val: memberCount, target: 500 },
      { label: '? Commands: 1K', val: cmds, target: 1000 },
      { label: '? Commands: 10K', val: cmds, target: 10000 },
      { label: '?? Messages: 10K', val: messages, target: 10000 },
    ];

    const fields = milestones.map(m => {
      const pct = Math.min(100, Math.round((m.val / m.target) * 100));
      const bar = '█'.repeat(Math.round(pct / 10)) + '█'.repeat(10 - Math.round(pct / 10));
      return { name: `${m.val >= m.target ? '?' : '??'} ${m.label}`, value: `\`${bar}\` **${pct}%** (${m.val}/${m.target})`, inline: true };
    });

    const embed = createEnterpriseEmbed()
      .setTitle('?? Milestone Tracker')
      
      .setThumbnail(interaction.guild.iconURL())
      .addFields(fields)
      
      ;
    const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_ent_milestone_tracker').setLabel('•🔄 Sync Enterprise Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [embed], components: [row] });
  }
};







