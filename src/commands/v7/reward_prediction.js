const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { validatePremiumLicense } = require('../../utils/enhancedPremiumGuard');
const { createEnterpriseEmbed } = require('../../utils/enhancedEmbeds');
const { User } = require('../../database/mongo');

const REWARD_THRESHOLDS = [50, 150, 300, 500, 1000];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reward_prediction')
    .setDescription('Predict when you will hit your next reward milestone')
    .addUserOption(opt => opt.setName('user').setDescription('User to check').setRequired(false)),

  async execute(interaction, client) {
    await interaction.deferReply();

            const license = await validatePremiumLicense(interaction, 'enterprise');
            if (!license.allowed) {
                return await interaction.editReply({ embeds: [license.embed], components: [license.components] });
            }
    const target = interaction.options.getUser('user') || interaction.user;
    const user = await User.findOne({ userId: target.id }).lean();
    const points = user?.staff?.points || 0;

    const nextThreshold = REWARD_THRESHOLDS.find(t => points < t);
    if (!nextThreshold) {
      return interaction.editReply(`?? **${target.username}** has unlocked all reward tiers with **${points}** points!`);
    }

    const needed = nextThreshold - points;
    const progress = Math.round((points / nextThreshold) * 100);
    const bar = '�'.repeat(Math.round(progress / 10)) + '�'.repeat(10 - Math.round(progress / 10));

    const embed = createEnterpriseEmbed()
      .setTitle(`?? Reward Prediction � ${target.username}`)
      
      .setThumbnail(target.displayAvatarURL())
      .addFields(
        { name: '? Current Points', value: points.toString(), inline: true },
        { name: '?? Next Reward at', value: nextThreshold.toString(), inline: true },
        { name: '?? Needed', value: `${needed} more points`, inline: true },
        { name: '?? Progress', value: `\`${bar}\` **${progress}%**` }
      )
      
      ;

    const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_ent_reward_prediction').setLabel('�� Sync Enterprise Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [embed], components: [row] });
  }
};





