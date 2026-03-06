const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { validatePremiumLicense } = require('../../utils/enhancedPremiumGuard');
const { createEnterpriseEmbed, createErrorEmbed, createSuccessEmbed } = require('../../utils/enhancedEmbeds');
const { Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reward_flow')
    .setDescription('View the full reward flow and recent distributions'),

  async execute(interaction, client) {
    await interaction.deferReply();

            const license = await validatePremiumLicense(interaction, 'enterprise');
            if (!license.allowed) {
                return await interaction.editReply({ embeds: [license.embed], components: [license.components] });
            }
    const guildId = interaction.guildId;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
    const rewards = await Activity.find({ guildId, type: 'promotion', createdAt: { $gte: thirtyDaysAgo } }).lean();
    const totalBonus = rewards.reduce((s, r) => s + (r.data?.bonusPoints || 10), 0);
    const recipients = [...new Set(rewards.map(r => r.userId))];
    const recent = rewards.slice(-5).map(r => `?? <@${r.userId}> � <t:${Math.floor(new Date(r.createdAt).getTime() / 1000)}:R>`).join('\n');
    const embed = createEnterpriseEmbed()
      .setTitle('?? Reward Flow Dashboard')
      
      .addFields(
        { name: '?? Reward Events (30d)', value: rewards.length.toString(), inline: true },
        { name: '? Total Bonus Points', value: totalBonus.toString(), inline: true },
        { name: '?? Unique Recipients', value: recipients.length.toString(), inline: true },
        { name: '?? Recent Rewards', value: recent || 'No rewards this month.' }
      )
      
      ;
    const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_ent_reward_flow').setLabel('�� Sync Enterprise Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [embed], components: [row] });
  }
};







