const { ContextMenuCommandBuilder, ApplicationCommandType } = require('discord.js');
const { createCoolEmbed, createErrorEmbed } = require('../../utils/embeds');

module.exports = {
    data: new ContextMenuCommandBuilder()
        .setName('View Staff Profile')
        .setType(ApplicationCommandType.User),

    async execute(interaction, client) {
        try {
            await interaction.deferReply({ ephemeral: true });
            const user = interaction.targetUser;
            const member = interaction.guild.members.cache.get(user.id) || await interaction.guild.members.fetch(user.id).catch(() => null);
            const staffSystem = client.systems.staff;

            if (!staffSystem) {
                return interaction.editReply({ embeds: [createErrorEmbed('Staff system is currently offline.')] });
            }

            const points = await staffSystem.getPoints(user.id, interaction.guildId);
            const rank = await staffSystem.getRank(user.id, interaction.guildId);
            const score = await staffSystem.calculateStaffScore(user.id, interaction.guildId);
            const warnings = await staffSystem.getUserWarnings(user.id, interaction.guildId);

            const { User } = require('../../database/mongo');
            const { createRadarChart } = require('../../utils/charts');

            const dbUser = await User.findOne({ userId: user.id }) || {};
            const xp = dbUser.stats?.xp || 0;
            const level = dbUser.stats?.level || 1;

            const trophies = dbUser.staff?.trophies || [];
            const trophyDisplay = trophies.length > 0 ? trophies.map(t => `🏆 ${t}`).join('\n') : 'No Trophies Yet';

            const warningPenalty = Math.max(0, 100 - ((warnings?.total || 0) * 20));
            const activityScore = Math.min(100, points > 0 ? (points / 50) * 100 : 0);
            const xpScore = Math.min(100, (level / 10) * 100);

            const chartUrl = createRadarChart(
                ['Overall Score', 'Shift Activity', 'Behavior', 'Bot Engagement'],
                [score || 0, activityScore, warningPenalty, xpScore],
                'Staff Skills'
            );

            const embed = createCoolEmbed()
                .setTitle(`👤 ${user.username}'s Staff Profile`)
                .setThumbnail(user.displayAvatarURL({ dynamic: true }))
                .setImage(chartUrl)
                .addFields(
                    { name: '📛 Username', value: user.username, inline: true },
                    { name: '🏷️ Nickname', value: member?.nickname || 'None', inline: true },
                    { name: '📅 Joined Server', value: member?.joinedTimestamp ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : 'Unknown', inline: true },
                    { name: '⭐ Points', value: `\`${points}\``, inline: true },
                    { name: '🏆 Rank', value: `\`${rank.toUpperCase()}\``, inline: true },
                    { name: '📈 Score', value: `\`${score || 0}/100\``, inline: true },
                    { name: '⚠️ Warnings', value: `\`${warnings?.total || 0}\``, inline: true },
                    { name: '🎮 Global Level', value: `Level ${level}\n*(${xp} XP)*`, inline: true },
                    { name: '🎖️ Achievements', value: trophyDisplay, inline: false }
                );

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('ViewProfile Context Menu Error:', error);
            const errEmbed = createErrorEmbed('An error occurred while fetching the staff profile.');
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({ embeds: [errEmbed] });
            } else {
                await interaction.editReply({ embeds: [errEmbed], ephemeral: true });
            }
        }
    }
};
