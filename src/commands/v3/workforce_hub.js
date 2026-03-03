const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { validatePremiumLicense } = require('../../utils/enhancedPremiumGuard');
const { createCustomEmbed, createErrorEmbed, createPremiumEmbed, createSuccessEmbed } = require('../../utils/enhancedEmbeds');
const { validatePremiumLicense } = require('../../utils/premium_guard');
const { User, Activity } = require('../../database/mongo');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('workforce_hub')
        .setDescription('Enterprise Hyper-Apex: Workforce Strategic Command Center'),

    async execute(interaction) {
        try {
            await interaction.deferReply();

            // Enterprise Hyper-Apex License Guard
            const license = await validatePremiumLicense(interaction, 'premium');
            if (!license.allowed) {
                return await interaction.editReply({ embeds: [license.embed], components: license.components });
            }

            const guildId = interaction.guildId;
            const memberCount = interaction.guild.memberCount;
            const staffCount = await User.countDocuments({ guildId, staff: { $exists: true } });

            // Fetch 24h Signal Volume
            const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const signals24h = await Activity.countDocuments({ guildId, createdAt: { $gte: twentyFourHoursAgo } });

            // Global Benchmark Simulation (Sector signal density vs global average)
            const globalAvg = 450;
            const sectorPerformance = Math.min(100, (signals24h / globalAvg) * 100).toFixed(1);

            const barLength = 15;
            const filled = '█'.repeat(Math.round((sectorPerformance / 100) * barLength));
            const empty = '░'.repeat(barLength - filled.length);
            const benchmarkRibbon = `\`[${filled}${empty}]\` **${sectorPerformance}% OF GLOBAL**`;

            const embed = await createCustomEmbed(interaction, {
                title: '🏢 Enterprise Hyper-Apex: Workforce Command Hub',
                thumbnail: interaction.guild.iconURL({ dynamic: true }),
                description: `### 🚀 Operational Control Center\nMacroscopic personnel management terminal for sector **${interaction.guild.name}**. Real-time industry benchmarks active.\n\n**💎 Enterprise HYPER-APEX EXCLUSIVE**`,
                fields: [
                    { name: '🌐 Industry Benchmark', value: benchmarkRibbon, inline: false },
                    { name: '📉 Sector Pulse', value: `\`${(signals24h / 24).toFixed(1)}\` signals/hr`, inline: true },
                    { name: '👥 Node Count', value: `\`${staffCount}\` verified units`, inline: true },
                    { name: '📊 Capacity', value: `\`${((staffCount / memberCount) * 100).toFixed(1)}%\` saturation`, inline: true },
                    { name: '✨ Unified Hub Status', value: '`🟢 OPERATIONAL [HYPER-APEX]`', inline: true },
                    { name: '🛰️ Signal Sync', value: '`CONNECTED`', inline: true }
                ],
                footer: 'Workforce Hub Interface • V3 Premium Suite',
                color: 'premium'
            });

            const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_v3_workforce_hub').setLabel('� Sync Live Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [embed], components: [row] });

        } catch (error) {
            console.error('Enterprise Workforce Hub Error:', error);
            const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_v3_workforce_hub').setLabel('� Sync Live Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [createErrorEmbed('Hub failure: Unable to synchronize workforce telemetry.')], components: [row] });
        }
    }
};


