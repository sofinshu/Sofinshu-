const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createCustomEmbed } = require('./embeds');
const { Guild } = require('../database/mongo');

/**
 * Enforces Premium/Enterprise license checks for high-tier commands.
 * @param {object} interaction The command interaction.
 * @param {string} requiredTier 'premium' | 'enterprise'
 * @returns {Promise<{ allowed: boolean, embed?: object, components?: object[] }>}
 */
async function validatePremiumLicense(interaction, requiredTier = 'premium') {
    const guildId = interaction.guildId;
    const guildData = await Guild.findOne({ guildId }).lean();

    const isPremium = guildData?.premium?.isActive || false;
    const tier = guildData?.premium?.tier || 'free';

    // Logic: 
    // - If enterprise is required, must be enterprise.
    // - If premium is required, can be premium or enterprise.
    let accessDenied = false;
    if (!isPremium || tier === 'free') {
        accessDenied = true;
    } else if (requiredTier === 'enterprise' && tier !== 'enterprise') {
        accessDenied = true;
    }

    if (accessDenied) {
        const tierName = requiredTier.charAt(0).toUpperCase() + requiredTier.slice(1);
        const icon = requiredTier === 'enterprise' ? '👑' : '✨';

        const embed = await createCustomEmbed(interaction, {
            title: `🚫 Access Denied: ${tierName} Subscription Required`,
            thumbnail: interaction.guild.iconURL({ dynamic: true }),
            description: `### 🔐 Restricted ${tierName} Operations\nThe requested command belongs to the **${tierName} Suite**, which requires an active ${tierName} license.\n\nYour current sector is operating on a **${tier.toUpperCase()} Tier** license. Macroscopic intelligence and advanced sector management require a valid upgrade.`,
            fields: [
                { name: '⚖️ License Status', value: `\`🔴 UNAUTHORIZED\``, inline: true },
                { name: `${icon} Required Tier`, value: `\`${tierName}\``, inline: true },
                { name: '🛠️ Resolution', value: 'Upgrade your sector license via the dashboard or use `/buy`.', inline: false }
            ],
            footer: `${tierName} License Enforcement • Enterprise Infrastructure`,
            color: 'premium'
        });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel(`Upgrade to ${tierName}`)
                .setStyle(ButtonStyle.Link)
                .setURL('https://example.com/premium')
                .setEmoji(icon),
            new ButtonBuilder()
                .setLabel('View Tier Comparison')
                .setStyle(ButtonStyle.Secondary)
                .setCustomId('view_premium_features')
                .setEmoji('📊')
        );

        return { allowed: false, embed, components: [row] };
    }

    return { allowed: true, guildData };
}

module.exports = { validatePremiumLicense };
