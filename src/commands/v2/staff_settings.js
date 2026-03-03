const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/embeds');
const { User } = require('../../database/mongo');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('staff_settings')
        .setDescription('ðŸŽ¨ Personalize your staff identity and tactical themes')
        .addStringOption(opt => opt.setName('tagline').setDescription('Set your personal staff bio/tagline').setMaxLength(100))
        .addStringOption(opt => opt.setName('color').setDescription('Set your profile accent color (Hex, e.g. #FF0000)')),

    async execute(interaction) {
        try {
            await interaction.deferReply({ ephemeral: true });
            const tagline = interaction.options.getString('tagline');
            const color = interaction.options.getString('color');
            const guildId = interaction.guildId;

            let userData = await User.findOne({ userId: interaction.user.id, guildId });
            if (!userData || !userData.staff) {
                const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_btn_staff_settings').setLabel('ðŸ„ Sync Live Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [createErrorEmbed('No staff profile detected to customize.')], components: [row] });
            }

            const updates = [];
            if (tagline !== null) {
                userData.staff.tagline = tagline;
                updates.push('Tagline calibrated');
            }
            if (color !== null) {
                // Simple hex validation
                if (/^#[0-9A-F]{6}$/i.test(color)) {
                    userData.staff.profileColor = color;
                    updates.push('Accent color updated');
                } else {
                    const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_btn_staff_settings').setLabel('ðŸ„ Sync Live Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [createErrorEmbed('Invalid hex color format. Use e.g. `#FF0000`')], components: [row] });
                }
            }

            if (updates.length === 0) {
                return interaction.editReply({ content: 'No calibration changes requested.' });
            }

            await userData.save();

            const embed = await createCustomEmbed(interaction, {
                title: 'ðŸŽ¨ Profile Calibration Complete',
                description: `### ðŸ›¡ï¸ Tactical Identity Synchronized\nYour personalized staff themes have been successfully recorded for the **${interaction.guild.name}** sector.\n\n**Applied Changes:**\n${updates.map(u => `âž” ${u}`).join('\n')}`,
                color: userData.staff.profileColor || 'success'
            });

            const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_btn_staff_settings').setLabel('ðŸ„ Sync Live Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [embed], components: [row] });

        } catch (error) {
            console.error('Staff Settings Error:', error);
            const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_btn_staff_settings').setLabel('ðŸ„ Sync Live Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [createErrorEmbed('Failed to synchronize personnel settings.')], components: [row] });
        }
    }
};


