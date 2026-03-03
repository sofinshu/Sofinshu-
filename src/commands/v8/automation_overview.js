const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { validatePremiumLicense } = require('../../utils/enhancedPremiumGuard');
const { createEnterpriseEmbed, createErrorEmbed, createSuccessEmbed } = require('../../utils/enhancedEmbeds');
const { validatePremiumLicense } = require('../../utils/premium_guard');
const { Guild } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('automation_overview')
    .setDescription('Visual overview of all automation configurations'),

  async execute(interaction, client) {
    await interaction.deferReply();

            const license = await validatePremiumLicense(interaction, 'enterprise');
            if (!license.allowed) {
                return await interaction.editReply({ embeds: [license.embed], components: [license.components] });
            }
    const guildId = interaction.guildId;
    const guild = await Guild.findOne({ guildId }).lean();
    const modules = guild?.settings?.modules || {};
    const settings = guild?.settings || {};

    const moduleStatus = [
      ['??? Moderation', modules.moderation],
      ['?? Analytics', modules.analytics],
      ['?? Automation', modules.automation],
      ['?? Tickets', modules.tickets],
    ].map(([name, enabled]) => `${enabled ? '??' : '??'} ${name}: **${enabled ? 'ON' : 'OFF'}**`).join('\n');

    const configStatus = [
      ['?? Log Channel', settings.logChannel ? `<#${settings.logChannel}>` : '? Not set'],
      ['?? Muted Role', settings.mutedRole ? `<@&${settings.mutedRole}>` : '? Not set'],
      ['?? Timezone', settings.timezone || 'UTC'],
      ['?? Welcome Channel', settings.welcomeChannel ? `<#${settings.welcomeChannel}>` : '? Not set'],
    ].map(([name, val]) => `${name}: **${val}**`).join('\n');

    const activeCount = [modules.moderation, modules.analytics, modules.automation, modules.tickets].filter(Boolean).length;

    const embed = createEnterpriseEmbed()
      .setTitle('?? Automation Overview')
      
      .addFields(
        { name: `?? Modules (${activeCount}/4 Active)`, value: moduleStatus },
        { name: '?? Configuration', value: configStatus }
      )
      
      ;

    const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_ent_automation_overview').setLabel('�� Sync Enterprise Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [embed], components: [row] });
  }
};







