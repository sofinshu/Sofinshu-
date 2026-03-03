const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/enhancedEmbeds');
const { Activity } = require('../../database/mongo');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('v2_heatmap')
        .setDescription('🌡️ Advanced interactive activity heatmap with real-time analytics.'),

    async execute(interaction) {
        try {
            // Defer reply immediately so Discord doesn't timeout the command while we fetch data
            const sent = await interaction.deferReply({ fetchReply: true });

            // Generate initial default view (30 days)
            await renderHeatmap(interaction, sent, 30);

        } catch (error) {
            console.error('[v2_heatmap] Critical Error:', error);
            const errEmbed = createErrorEmbed('Critical failure in heatmap visualization matrix.');
            if (interaction.deferred || interaction.replied) { return await interaction.editReply({ embeds: [errEmbed], components: [row] }); } else await interaction.editReply({ embeds: [errEmbed], ephemeral: true });
        }
    }
};

/**
 * Generates and updates the heatmap embed with interactive timeframe controls
 */
async function renderHeatmap(interaction, replyMessage, daysBack) {
    const guildId = interaction.guildId;
    const timeAgo = new Date(Date.now() - daysBack * 86400000);

    const activities = await Activity.find({
        guildId,
        createdAt: { $gte: timeAgo }
    }).lean();

    if (activities.length === 0) {
        return interaction.editReply({ embeds: [createErrorEmbed(`Insufficient telemetry data over the last ${daysBack} days. Establish more activity logging to generate a matrix.`)] });
    }

    // --- 1. Data Aggregation ---
    const hourCounts = new Array(24).fill(0);
    const dayCounts = new Array(7).fill(0);
    
    activities.forEach(a => {
        const date = new Date(a.createdAt);
        hourCounts[date.getHours()]++;
        dayCounts[date.getDay()]++;
    });

    const maxCount = Math.max(...hourCounts, 1);
    const peakHour = hourCounts.indexOf(maxCount);
    const quietHour = hourCounts.indexOf(Math.min(...hourCounts));
    const maxDay = dayCounts.indexOf(Math.max(...dayCounts));

    // --- 2. Dynamic ASCII Visualization ---
    const heatChars = ['░', '▒', '▓', '█'];
    const heatmapRows = [3, 2, 1, 0].map(level => {
        return hourCounts.map(count => {
            const intensity = Math.floor((count / maxCount) * 4);
            // Clamp intensity to max 3
            const safeIntensity = Math.min(intensity, 3);
            return safeIntensity >= level ? heatChars[safeIntensity] : ' ';
        }).join('');
    });

    const hourLabels = Array.from({ length: 24 }, (_, i) => (i % 6 === 0) ? String(i).padStart(2, '0') : '  ').join('');
    const heatmapStr = [...heatmapRows, hourLabels].join('\n');

    // --- 3. Dynamic Color Coding based on Activity Density ---
    // Average events per day as a rough metric of "Heat"
    const eventsPerDay = activities.length / daysBack;
    let heatColor = '#5865F2'; // Base Blurple (Cool)
    let heatEmoji = '🧊';
    
    if (eventsPerDay > 10) { heatColor = '#FEE75C'; heatEmoji = '☀️'; } // Yellow (Warm)
    if (eventsPerDay > 50) { heatColor = '#ED4245'; heatEmoji = '🔥'; } // Red (Hot)
    if (eventsPerDay > 150) { heatColor = '#ff73fa'; heatEmoji = '🎇'; } // Pink (Supernova - Premium)

    // --- 4. Formatted Strings ---
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayBreakdown = dayCounts.map((c, i) => {
        const pct = Math.round((c / Math.max(...dayCounts, 1)) * 10);
        return `\`${dayNames[i]}\` ${'█'.repeat(pct)}${'░'.repeat(10 - pct)} \`${c}\``;
    }).join('\n');

    // --- 5. Build the Dynamic Embed ---
    const embed = await createCustomEmbed(interaction, {
        title: `${heatEmoji} Real-Time Activity Matrix — ${interaction.guild.name}`,
        thumbnail: interaction.guild.iconURL({ dynamic: true, size: 128 }),
        description: `Visualizing **${activities.length.toLocaleString()}** telemetry events over exactly **${daysBack} days**.\n\n### ⏱️ Hourly Density Chart\n\`\`\`text\n${heatmapStr}\`\`\`\n*Intensity scale: █ High  ▓ Mid  ▒ Low  ░ Trace*`,
        fields: [
            { name: '📈 Peak Saturation', value: `\`${String(peakHour).padStart(2, '0')}:00\`\n(${maxCount} events)`, inline: true },
            { name: '📉 Lowest Volume', value: `\`${String(quietHour).padStart(2, '0')}:00\``, inline: true },
            { name: '📅 Top Active Day', value: `\`${dayNames[maxDay]}\`\n(${dayCounts[maxDay]} events)`, inline: true },
            { name: '📊 Day-over-Day Distribution', value: dayBreakdown, inline: false }
        ],
        color: heatColor,
        footer: `uwu-chan • T-${daysBack}d Analytic Slice`
    });

    // --- 6. Interactive Controls (Action Rows) ---
    // We update the buttons so the currently viewed timeframe is disabled (indicating it's active)
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('heat_7')
            .setLabel('7 Days')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(daysBack === 7),
        new ButtonBuilder()
            .setCustomId('heat_30')
            .setLabel('30 Days')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(daysBack === 30),
        new ButtonBuilder()
            .setCustomId('heat_90')
            .setLabel('90 Days')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(daysBack === 90),
        new ButtonBuilder()
            .setCustomId('heat_refresh')
            .setLabel('  Sync Live Data')
            .setStyle(ButtonStyle.Secondary)
    );

    await interaction.editReply({ embeds: [embed], components: [row] });

    // --- 7. Setup Interaction Collector for Buttons ---
    const collector = replyMessage.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 120000 // Buttons stay active for 2 minutes
    });

    collector.on('collect', async i => {
        // Only allow the user who requested it to click buttons
        if (i.user.id !== interaction.user.id) {
            return i.reply({ content: '❌ You must run the command yourself to use the matrix controls.', ephemeral: true });
        }

        // Defer update so discord knows we received the button click
        await i.deferUpdate();

        let newDays = daysBack; // Default to current if it's just a refresh
        if (i.customId === 'heat_7') newDays = 7;
        if (i.customId === 'heat_30') newDays = 30;
        if (i.customId === 'heat_90') newDays = 90;

        // Recursive render for the new timeframe
        await renderHeatmap(interaction, replyMessage, newDays);
    });

    collector.on('end', () => {
        // Expire buttons gracefully
        const expiredRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('heat_exp')
                .setLabel('Session Expired')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true)
        );
        interaction.editReply({ components: [expiredRow] }).catch(() => {}); // Catch in case message was deleted
    });
}
