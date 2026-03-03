const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { validatePremiumLicense } = require('../../utils/enhancedPremiumGuard');
const { createEnterpriseEmbed, createErrorEmbed, createSuccessEmbed } = require('../../utils/enhancedEmbeds');
const { validatePremiumLicense } = require('../../utils/premium_guard');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('milestone_effects')
    .setDescription('View visual milestone completion effects'),

  async execute(interaction, client) {
    await interaction.deferReply();

            const license = await validatePremiumLicense(interaction, 'enterprise');
            if (!license.allowed) {
                return await interaction.editReply({ embeds: [license.embed], components: [license.components] });
            }
    const { Guild } = require('../../database/mongo');
    const guildId = interaction.guildId;
    const guild = await Guild.findOne({ guildId }).lean();
    const memberCount = interaction.guild.memberCount;
    const cmds = guild?.stats?.commandsUsed || 0;

    const milestones = [
      { label: '?? 50 Members', val: memberCount, target: 50 },
      { label: '?? 100 Members', val: memberCount, target: 100 },
      { label: '? 500 Commands', val: cmds, target: 500 },
      { label: '? 1K Commands', val: cmds, target: 1000 },
    ];

    const effects = milestones.map(m => {
      const pct = Math.min(100, Math.round((m.val / m.target) * 100));
      const bar = '�'.repeat(Math.round(pct / 10)) + '�'.repeat(10 - Math.round(pct / 10));
      return `${m.val >= m.target ? '?' : '??'} **${m.label}**: \`${bar}\` ${pct}%`;
    }).join('\n');

    const embed = createEnterpriseEmbed()
      .setTitle('? Milestone Effects')
      
      .setDescription(effects)
      
      ;
    const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_ent_milestone_effects').setLabel('�� Sync Enterprise Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [embed], components: [row] });
  }
};







