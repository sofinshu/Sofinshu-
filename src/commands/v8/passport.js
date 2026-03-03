const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createCustomEmbed, createEnterpriseEmbed, createErrorEmbed, createProgressBar, createSuccessEmbed } = require('../../utils/embeds');
const { validatePremiumLicense } = require('../../utils/premium_guard');
const { User, Shift } = require('../../database/mongo');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('passport')
        .setDescription('👑 Enterprise Identity Passport — complete staff profile with real shift history')
        .addUserOption(opt => opt.setName('user').setDescription('Staff member to view').setRequired(false)),

    async execute(interaction) {
        try {
            await interaction.deferReply();

            const license = await validatePremiumLicense(interaction, 'enterprise');
            if (!license.allowed) {
                return await return await interaction.editReply({ embeds: [license.embed], components: license.components });
            }

            const target = interaction.options.getUser('user') || interaction.user;
            const guildId = interaction.guildId;

            const [user, recentShifts] = await Promise.all([
                User.findOne({ userId: target.id, 'guilds.guildId': guildId }).lean(),
                Shift.find({ userId: target.id, guildId, endTime: { $ne: null } })
                    .sort({ startTime: -1 }).limit(5).lean()
            ]);

            if (!user || !user.staff) {
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('auto_ent_passport')
                        .setLabel('  Sync Enterprise Data')
                        .setStyle(ButtonStyle.Secondary)
                );
                return await interaction.editReply({
                    embeds: [createErrorEmbed(`No staff record found for <@${target.id}>. They must use the bot first.`)],
                    components: [row]
                });
            }

            const staff = user.staff;
            const pts = staff.points || 0;
            const level = staff.level || 1;
            const rank = (staff.rank || 'Member').toUpperCase();
            const consistency = staff.consistency || 100;
            const reputation = staff.reputation || 0;
            const achievements = staff.achievements || [];
            const streak = staff.streak || 0;

            // Holographic ribbon
            const barLength = 15;
            const holoPct = Math.min(100, Math.round((pts % 1000) / 1000 * 100));
            const symbols = ['💠', '✦', '💎', '✧', '💠'];
            const holoBar = Array.from({ length: barLength }, (_, i) => {
                return i < Math.round(holoPct / 100 * barLength) ? symbols[i % symbols.length] : '░';
            }).join('');
            const identityRibbon = `\`[${holoBar}]\` **LVL ${level} — ${rank}**`;

            // Shift history
            const totalShiftSecs = recentShifts.reduce((s, sh) => s + (sh.duration || 0), 0);
            const totalHours = Math.floor(totalShiftSecs / 3600);
            const shiftHistory = recentShifts.length > 0
                ? recentShifts.map(s => {
                    const dur = s.duration ? `${Math.floor(s.duration / 3600)}h ${Math.floor((s.duration % 3600) / 60)}m` : 'N/A';
                    const when = `<t:${Math.floor(new Date(s.startTime).getTime() / 1000)}:R>`;
                    return `• ${when} — \`${dur}\``;
                }).join('\n')
                : '`No shifts recorded yet`';

            // Achievement display
            const achieveDisplay = achievements.length > 0
                ? achievements.slice(0, 6).map(a => `🏅 ${a}`).join('\n')
                : '`No achievements yet`';

            // Tier display (based on pts)
            const tiers = ['V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7', 'V8'];
            const sectorStatus = tiers.map((t, i) => pts > i * 125 ? `\`✅${t}\`` : `\`❌${t}\``).join(' ');

            const embed = await createCustomEmbed(interaction, {
                title: `👑 Enterprise Passport: ${target.username}`,
                thumbnail: target.displayAvatarURL({ dynamic: true, size: 256 }),
                description: `The definitive identity record for **${target.username}** in **${interaction.guild.name}**.\n\n${identityRibbon}\n\n**Sector Access:**\n${sectorStatus}`,
                fields: [
                    { name: '⭐ Points', value: `\`${pts.toLocaleString()}\``, inline: true },
                    { name: '📊 Consistency', value: `\`${createProgressBar(consistency)}\` ${consistency}%`, inline: false },
                    { name: '🤝 Reputation', value: `\`${reputation}\` commendations`, inline: true },
                    { name: '🔥 Shift Streak', value: `\`${streak}\` days`, inline: true },
                    { name: '⏱️ Total Shift Time (Last 5)', value: `\`${totalHours}h\` across \`${recentShifts.length}\` shifts`, inline: false },
                    { name: '📅 Recent Shifts', value: shiftHistory, inline: false },
                    { name: '🏅 Achievements', value: achieveDisplay, inline: false }
                ],
                color: 'enterprise',
                footer: `uwu-chan • Enterprise Passport • ID: ${target.id}`
            });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('auto_ent_passport')
                    .setLabel('  Sync Enterprise Data')
                    .setStyle(ButtonStyle.Secondary)
            );
            return await interaction.editReply({ embeds: [embed], components: [row] });
        } catch (error) {
            console.error('[Enterprise_passport] Error:', error);
            const errEmbed = createErrorEmbed('Failed to load Enterprise Passport.');
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('auto_ent_passport')
                    .setLabel('  Sync Enterprise Data')
                    .setStyle(ButtonStyle.Secondary)
            );
            if (interaction.deferred || interaction.replied) {
                return await return await interaction.editReply({ embeds: [errEmbed], components: [row] });
            } else {
                return await interaction.editReply({ embeds: [errEmbed], ephemeral: true });
            }
        }
    }
};
