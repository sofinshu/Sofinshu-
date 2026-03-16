const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { validatePremiumLicense } = require('../../utils/enhancedPremiumGuard');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/enhancedEmbeds');
const { ApplicationConfig } = require('../../database/mongo');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('apply_setup')
        .setDescription('⚙️ Configure the interactive application panel for your server')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addChannelOption(opt =>
            opt.setName('apply_channel')
                .setDescription('The text channel where the spawning /apply_panel should live')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true))
        .addChannelOption(opt =>
            opt.setName('review_channel')
                .setDescription('The hidden staff channel to send submitted applications for review')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true))
        .addRoleOption(opt =>
            opt.setName('reviewer_role')
                .setDescription('The role pinged when a new application is submitted')
                .setRequired(false)),

    async execute(interaction) {
        try {
            await interaction.deferReply({ ephemeral: true });

            const applyChannel = interaction.options.getChannel('apply_channel');
            const reviewChannel = interaction.options.getChannel('review_channel');
            const reviewerRole = interaction.options.getRole('reviewer_role');

            let config = await ApplicationConfig.findOne({ guildId: interaction.guildId });
            if (!config) {
                config = new ApplicationConfig({ guildId: interaction.guildId });
            }

            // Map strict ID values
            config.applyChannelId = applyChannel.id;
            config.reviewChannelId = reviewChannel.id;
            if (reviewerRole) {
                config.reviewerRoleId = reviewerRole.id;
            } else {
                config.reviewerRoleId = null;
            }
            config.enabled = true;

            await config.save();

            const embed = await createCustomEmbed(interaction, {
                title: '✨ Strategic Talent Pipeline Deployed',
                description: `Successfully established a high-fidelity application listener for the **${interaction.guild.name}** sector. All incoming signals are now routed for review.`,
                thumbnail: interaction.guild.iconURL({ dynamic: true }),
                fields: [
                    { name: '📝 Injection Node', value: `<#${applyChannel.id}>`, inline: true },
                    { name: '🕵️ Review Grid', value: `<#${reviewChannel.id}>`, inline: true },
                    { name: '🔔 Alert Role', value: reviewerRole ? `<@&${reviewerRole.id}>` : '*No Role Broadcast*', inline: true }
                ],
                footer: 'Deployment signal verified. Execute /apply_panel to initialize the UI.',
                color: 'success'
            });

            const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_btn_apply_setup').setLabel('🔄 Sync Live Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [embed], components: [row] });

        } catch (error) {
            console.error('Apply Setup Error:', error);
            const errEmbed = createErrorEmbed('A database error occurred while trying to configure the application system.');
            if (interaction.deferred || interaction.replied) {
                const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_btn_apply_setup').setLabel('🔄 Sync Live Data').setStyle(ButtonStyle.Secondary));
            return await interaction.editReply({ embeds: [errEmbed], components: [row] });
            } else {
                await interaction.editReply({ embeds: [errEmbed], ephemeral: true });
            }
        }
    }
};


