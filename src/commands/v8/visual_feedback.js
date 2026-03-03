const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { validatePremiumLicense } = require('../../utils/enhancedPremiumGuard');
const { createEnterpriseEmbed, createErrorEmbed, createSuccessEmbed } = require('../../utils/enhancedEmbeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('visual_feedback')
    .setDescription('Submit or view visual feedback about the bot')
    .addStringOption(opt => opt.setName('message').setDescription('Your feedback (optional)').setRequired(false)),

  async execute(interaction, client) {
    await interaction.deferReply();

            const license = await validatePremiumLicense(interaction, 'enterprise');
            if (!license.allowed) {
                return await interaction.editReply({ embeds: [license.embed], components: [license.components] });
            }
    const { Guild } = require('../../database/mongo');
    const guildId = interaction.guildId;
    const guild = await Guild.findOne({ guildId }).lean();
    const feedback = interaction.options.getString('message');
    const tier = guild?.premium?.tier || 'free';
    const cmds = guild?.stats?.commandsUsed || 0;

    const ratingBar = (v, max) => '�'.repeat(Math.round(v / max * 5)) + '�'.repeat(5 - Math.round(v / max * 5));

    const embed = createEnterpriseEmbed()
      .setTitle('?? Visual Feedback')
      
      .addFields(
        { name: '? Bot Rating', value: `\`${ratingBar(cmds, 1000)}?\` Based on usage` },
        { name: '??? Your Tier', value: tier.toUpperCase(), inline: true },
        { name: '? Commands Used', value: cmds.toString(), inline: true }
      )
      
      ;

    if (feedback) embed.setDescription(`?? **Your Feedback:** ${feedback}\n\nThank you! This helps us improve the bot.`);
    else embed.setDescription('Use `/visual_feedback message:Your feedback here` to submit feedback.');

    const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_ent_visual_feedback').setLabel('�� Sync Enterprise Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [embed], components: [row] });
  }
};







