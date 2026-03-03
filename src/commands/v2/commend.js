const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { validatePremiumLicense } = require('../../utils/enhancedPremiumGuard');
const { validatePremiumLicense } = require('../../utils/enhancedPremiumGuard');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/enhancedEmbeds');
const { User } = require('../../database/mongo');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('commend')
        .setDescription('🤝 Award honor points to a colleague for exemplary teamwork')
        .addUserOption(opt => opt.setName('user').setDescription('Colleague to commend').setRequired(true))
        .addStringOption(opt => opt.setName('reason').setDescription('Reason for recognition').setRequired(true)),

    async execute(interaction) {
        try {
            await interaction.deferReply();
            const targetUser = interaction.options.getUser('user');
            const reason = interaction.options.getString('reason');
            const guildId = interaction.guildId;

            if (targetUser.id === interaction.user.id) {
                const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_btn_commend').setLabel('  Sync Live Data').setStyle(ButtonStyle.Secondary));
                return await interaction.editReply({ embeds: [createErrorEmbed('Self-commendation protocol is prohibited for data integrity.')], components: [row] });
            }

            const [sender, receiver] = await Promise.all([
                User.findOne({ userId: interaction.user.id, guildId }),
                User.findOne({ userId: targetUser.id, guildId })
            ]);

            if (!sender || !sender.staff || !receiver || !receiver.staff) {
                const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_btn_commend').setLabel('  Sync Live Data').setStyle(ButtonStyle.Secondary));
                return await interaction.editReply({ embeds: [createErrorEmbed('Personnel not found in the staff registry.')], components: [row] });
            }

            // Logic: Increase honor points and update honorific title
            receiver.staff.honorPoints = (receiver.staff.honorPoints || 0) + 1;

            const honor = receiver.staff.honorPoints;
            if (honor >= 50) receiver.staff.honorific = 'Legendary Ally';
            else if (honor >= 25) receiver.staff.honorific = 'Distinguished Peer';
            else if (honor >= 10) receiver.staff.honorific = 'Reliable Partner';
            else if (honor >= 5) receiver.staff.honorific = 'Valued Colleague';

            await receiver.save();

            const embed = await createCustomEmbed(interaction, {
                title: '🤝 Peer Commendation Authenticated',
                description: `### 🛡️ Cultural Excellence Recognition\n<@${interaction.user.id}> has officially commended <@${targetUser.id}> for exemplary teamwork in sector **${interaction.guild.name}**.`,
                fields: [
                    { name: '👤 Recipient', value: `<@${targetUser.id}>`, inline: true },
                    { name: '🎖️ New Honorific', value: `\`${receiver.staff.honorific}\``, inline: true },
                    { name: '✨ Reason', value: `> *${reason}*`, inline: false }
                ],
                footer: 'Peer recognition builds organizational resilience. • V2 Apex',
                color: 'premium'
            });

            const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_btn_commend').setLabel('  Sync Live Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [embed], components: [row] });

        } catch (error) {
            console.error('Commend Error:', error);
            const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_btn_commend').setLabel('  Sync Live Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [createErrorEmbed('Cultural suite failure: Unable to record peer recognition.')], components: [row] });
        }
    }
};

