const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { Guild } = require('../../database/mongo');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('promo_list')
        .setDescription('📜 View all authentic rank requirements and point thresholds for this server'),

    async execute(interaction) {
        try {
            await interaction.deferReply();
            const guild = await Guild.findOne({ guildId: interaction.guildId }).lean();

            if (!guild || !guild.promotionRequirements) {
                const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_btn_promo_list').setLabel('� Sync Live Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [createErrorEmbed('This server has not configured any promotion requirements.')], components: [row] });
            }

            const ranks = Object.keys(guild.promotionRequirements);
            if (ranks.length === 0) {
                const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_btn_promo_list').setLabel('� Sync Live Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [createErrorEmbed('No ranks are currently established in the database.')], components: [row] });
            }

            const rankEmojis = ['🛡️', '🌟', '💎', '👑', '🔥', '🚀'];

            const embed = await createCustomEmbed(interaction, {
                title: '📜 Strategic Advancement Handbook',
                description: `Official operational qualifications required for hierarchical advancement within the **${interaction.guild.name}** network.`,
                thumbnail: interaction.guild.iconURL({ dynamic: true })
            });

            ranks.forEach((rank, i) => {
                const req = guild.promotionRequirements[rank];
                const emoji = rankEmojis[i % rankEmojis.length];

                const details = [
                    `> ⭐ **Points**: \`${(req.points || 0).toLocaleString()}\``,
                    `> 🔄 **Shifts**: \`${(req.shifts || 0).toLocaleString()}\``,
                    `> 📈 **Reliability**: \`${req.consistency || 0}%\``,
                    req.maxWarnings !== undefined ? `> ⚠️ **Risk Limit**: \`${req.maxWarnings}\`` : null,
                    req.shiftHours > 0 ? `> ⏱️ **Flight Time**: \`${req.shiftHours}h\`` : null
                ].filter(Boolean).join('\n');

                embed.addFields({
                    name: `${emoji} Classification: ${rank.toUpperCase()}`,
                    value: details,
                    inline: true
                });
            });

            embed.setFooter({ text: 'Advancement protocols are strictly enforced based on target fulfillment.' });

            const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_btn_promo_list').setLabel('� Sync Live Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [embed], components: [row] });

        } catch (error) {
            console.error('Promo List Error:', error);
            const errEmbed = createErrorEmbed('An error occurred while fetching the promotion requirements list.');
            if (interaction.deferred || interaction.replied) {
                const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_btn_promo_list').setLabel('� Sync Live Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [errEmbed], components: [row] });
            } else {
                await interaction.reply({ embeds: [errEmbed], ephemeral: true });
            }
        }
    }
};


