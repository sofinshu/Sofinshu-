const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createEnterpriseEmbed, createErrorEmbed, createSuccessEmbed } = require('../../utils/embeds');
const { validatePremiumLicense } = require('../../utils/premium_guard');
const { Guild } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('premium_effects')
    .setDescription('View your premium tier benefits and effects'),

  async execute(interaction, client) {
    await interaction.deferReply();

            const license = await validatePremiumLicense(interaction, 'enterprise');
            if (!license.allowed) {
                return await interaction.editReply({ embeds: [license.embed], components: [license.components] });
            }
    const guildId = interaction.guildId;
    const guild = await Guild.findOne({ guildId }).lean();
    const tier = guild?.premium?.tier || 'free';
    const expiresAt = guild?.premium?.expiresAt;
    const expiryText = expiresAt ? `<t:${Math.floor(new Date(expiresAt).getTime() / 1000)}:R>` : 'Never (Lifetime)';

    const tierEffects = {
      free: ['? v1 & v2 commands (50 commands)', '? Basic staff tracking', '? Shift management'],
      premium: ['? All free features', '? v3, v4, v5 commands (75 commands total)', '? Advanced moderation', '? Performance analytics'],
      enterprise: ['? All premium features', '? v6, v7, v8 commands (175 commands total)', '? AI-powered insights', '? Visual dashboards', '? Automation ecosystem', '? Elite badges & rewards']
    };

    const benefits = (tierEffects[tier] || tierEffects.free).join('\n');
    const colors = { free: 0x95a5a6, premium: 0x3498db, enterprise: 0xf1c40f };

    const embed = createEnterpriseEmbed()
      .setTitle('?? Premium Effects & Benefits')
      
      .addFields(
        { name: '??? Current Tier', value: tier.toUpperCase(), inline: true },
        { name: '? Expires', value: tier === 'free' ? 'N/A' : expiryText, inline: true },
        { name: '? Your Benefits', value: benefits }
      )
      
      ;
    const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_ent_premium_effects').setLabel('�� Sync Enterprise Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [embed], components: [row] });
  }
};







