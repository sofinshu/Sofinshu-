const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { Guild } = require('../../database/mongo');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('promo_toggle')
        .setDescription('🔄 Toggle the auto-promotion background engine on or off')
        .addBooleanOption(opt => opt.setName('enabled').setDescription('Whether auto-promotion should be active in this server').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        try {
            await interaction.deferReply({ ephemeral: true });
            const enabled = interaction.options.getBoolean('enabled');

            await Guild.findOneAndUpdate(
                { guildId: interaction.guildId },
                { $set: { 'settings.modules.automation': enabled } },
                { upsert: true }
            );

            const statusStr = enabled ? '✅ ENGINE ONLINE' : '❌ ENGINE OFFLINE';

            const embed = await createCustomEmbed(interaction, {
                title: '⚙️ Promotion System Updated',
                description: `The interactive auto-promotion background scanner is now **${statusStr}** for this server.`,
                footer: enabled ? 'The bot will now auto-rank users who reach their threshold!' : 'Promotions must be granted manually.'
            });

            const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_btn_promo_toggle').setLabel('� Sync Live Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [embed], components: [row] });

        } catch (error) {
            console.error('Promo Toggle Error:', error);
            const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_btn_promo_toggle').setLabel('� Sync Live Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [createErrorEmbed('An error occurred while toggling the promotion engine.')], components: [row] });
        }
    }
};


