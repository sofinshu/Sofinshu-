const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/enhancedEmbeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('staff_hub')
        .setDescription('🕹️ Access the interactive Staff Control Center dashboard'),

    async execute(interaction) {
        try {
            await interaction.deferReply({ ephemeral: true });

            const embed = await createCustomEmbed(interaction, {
                title: '🕹️ Enterprise Hyper-Apex: Strategic Control Center',
                description: `### 🛡️ Authorized Access: ${interaction.user.username}\nWelcome to the unified terminal for **${interaction.guild.name}**. Select an operational module below to engage macroscopic telemetry.\n\n**💎 Enterprise HYPER-APEX EXCLUSIVE**`,
                thumbnail: interaction.guild.iconURL({ dynamic: true }),
                fields: [
                    { name: '📇 Identity Matrix', value: '`🟢 RESONANCE ACTIVE`', inline: true },
                    { name: '📈 Growth Analytics', value: '`🟢 SIGNAL STABLE`', inline: true },
                    { name: '📋 Registry Sublink', value: '`🟡 CALIBRATING...`', inline: true },
                    { name: '⚡ Pulse Frequency', value: '`4.2 Hz [OPTIMAL]`', inline: true },
                    { name: '🌐 Global Sync', value: '`CONNECTED`', inline: true },
                    { name: '✨ Visual Tier', value: '`DIVINE [APEX]`', inline: true }
                ],
                footer: 'Unified Operational Interface • V2 Expansion Hyper-Apex',
                color: 'premium'
            });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('hub_identity')
                    .setLabel('View Identity')
                    .setEmoji('📇')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('hub_promo')
                    .setLabel('Promotion Analytics')
                    .setEmoji('📈')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('hub_tasks')
                    .setLabel('Active Objectives')
                    .setEmoji('📋')
                    .setStyle(ButtonStyle.Secondary)
            );

            await interaction.editReply({ embeds: [embed], components: [row] });

        } catch (error) {
            console.error('Staff Hub Error:', error);
            await interaction.editReply({ embeds: [createErrorEmbed('Failed to initialize the control center terminal.')] });
        }
    }
};

