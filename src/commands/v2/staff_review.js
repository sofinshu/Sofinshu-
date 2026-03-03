const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');
const { User, Shift } = require('../../database/mongo');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('staff_review')
        .setDescription('🧠 Generate a high-fidelity AI-simulated performance intelligence report')
        .addUserOption(opt => opt.setName('user').setDescription('Staff member (Optional)')),

    async execute(interaction) {
        try {
            await interaction.deferReply();
            const targetUser = interaction.options.getUser('user') || interaction.user;
            const guildId = interaction.guildId;

            const [userData, shifts] = await Promise.all([
                User.findOne({ userId: targetUser.id, guildId }).lean(),
                Shift.find({ userId: targetUser.id, guildId }).lean()
            ]);

            if (!userData || !userData.staff) {
                const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_btn_staff_review').setLabel('� Sync Live Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [createErrorEmbed(`No intelligence data detected for <@${targetUser.id}>.`)], components: [row] });
            }

            const points = userData.staff.points || 0;
            const consistency = userData.staff.consistency || 0;
            const level = userData.staff.level || 1;
            const totalShifts = shifts.length;

            // Grade Logic
            let grade = 'C';
            let color = 'primary';
            if (consistency >= 90 && points >= 1000) { grade = 'S+'; color = 'enterprise'; }
            else if (consistency >= 85 && points >= 500) { grade = 'A'; color = 'premium'; }
            else if (consistency >= 75) { grade = 'B'; color = 'success'; }

            // Performance Insights Generator
            const insights = [];
            if (consistency < 70) insights.push('⚠️ **Consistency Alert**: Personnel exhibits high variance in operational continuity.');
            else insights.push('🟢 **Operational Stability**: High consistency maintained across recent patrols.');

            if (points > 1000) insights.push('🔥 **High-Value Asset**: Yield performance exceeds sector benchmarks.');
            else insights.push('📈 **Growth Potential**: Standard yield observed. Target points for advancement.');

            const mastery = userData.staff.commandUsage || {};
            const topModule = Object.keys(mastery).sort((a, b) => mastery[b] - mastery[a])[0] || 'NONE';

            const embed = await createCustomEmbed(interaction, {
                title: `🧠 Intelligence Report: ${targetUser.username}`,
                thumbnail: targetUser.displayAvatarURL({ dynamic: true }),
                description: `### 🛡️ Operational Performance Evaluation\nMacroscopic intelligence analysis for sector **${interaction.guild.name}**. Evaluation based on real-time behavioral telemetry.`,
                fields: [
                    { name: '📊 Tactical Grade', value: `\`Rank [${grade}]\``, inline: true },
                    { name: '📂 Primary Module', value: `\`${topModule.toUpperCase()}\``, inline: true },
                    { name: '👤 Level Clearance', value: `\`LVL ${level}\``, inline: true },
                    { name: '🔍 Performance Insights', value: insights.join('\n'), inline: false },
                    { name: '⭐ Aggregate Score', value: `\`${points.toLocaleString()}\` Tactical Points`, inline: true },
                    { name: '🔄 Operational Yield', value: `\`${totalShifts}\` Processed Patrols`, inline: true }
                ],
                footer: 'AI-Simulated Behavioral Analysis • Authorized Intelligence Suite',
                color: color
            });

            const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_btn_staff_review').setLabel('� Sync Live Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [embed], components: [row] });

        } catch (error) {
            console.error('Staff Review Error:', error);
            const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_btn_staff_review').setLabel('� Sync Live Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [createErrorEmbed('Intelligence suite failure: Unable to process performative telemetry.')], components: [row] });
        }
    }
};


