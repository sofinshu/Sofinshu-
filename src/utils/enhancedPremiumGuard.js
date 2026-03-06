const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createCustomEmbed, EMBED_COLORS } = require('./enhancedEmbeds');
const { Guild } = require('../database/mongo');

// Version to tier mapping
const VERSION_TIER_MAP = {
    v1: 'free',
    v1_context: 'free',
    v2: 'premium',
    v3: 'premium',
    v4: 'premium',
    v5: 'premium',
    v6: 'enterprise',
    v7: 'enterprise',
    v8: 'enterprise'
};

// Tier requirements for features
const TIER_FEATURES = {
    free: {
        maxStaff: 10,
        maxStorageDays: 7,
        analyticsDepth: 'basic',
        automation: false,
        predictions: false,
        visualReports: false
    },
    premium: {
        maxStaff: 100,
        maxStorageDays: 90,
        analyticsDepth: 'advanced',
        automation: true,
        predictions: false,
        visualReports: true
    },
    enterprise: {
        maxStaff: Infinity,
        maxStorageDays: 365,
        analyticsDepth: 'full',
        automation: true,
        predictions: true,
        visualReports: true
    }
};

/**
 * Gets the required tier for a command version
 * @param {string} version - Command version (v1, v2, etc.)
 * @returns {string}
 */
function getRequiredTier(version) {
    return VERSION_TIER_MAP[version] || 'free';
}

/**
 * Checks if a guild has access to a specific tier
 * @param {Object} guildData - Guild data from database
 * @param {string} requiredTier - Required tier
 * @returns {boolean}
 */
function hasTierAccess(guildData, requiredTier) {
    const isPremium = guildData?.premium?.isActive || false;
    const tier = guildData?.premium?.tier || 'free';
    
    if (requiredTier === 'free') return true;
    if (!isPremium) return false;
    if (requiredTier === 'premium') return ['premium', 'enterprise'].includes(tier);
    if (requiredTier === 'enterprise') return tier === 'enterprise';
    
    return false;
}

/**
 * Enhanced license validation with better UX
 * @param {Object} interaction - The command interaction
 * @param {string} requiredTier - 'premium' | 'enterprise'
 * @param {Object} options - Additional options
 * @returns {Promise<{ allowed: boolean, embed?: object, components?: object[], guildData?: object }>}
 */
async function validatePremiumLicense(interaction, requiredTier = 'premium', options = {}) {
    const guildId = interaction.guildId;
    const guildData = await Guild.findOne({ guildId }).lean();

    const isPremium = guildData?.premium?.isActive || false;
    const tier = guildData?.premium?.tier || 'free';
    const expiresAt = guildData?.premium?.expiresAt;

    // Check access
    let accessDenied = false;
    if (requiredTier === 'free') {
        accessDenied = false;
    } else if (!isPremium || tier === 'free') {
        accessDenied = true;
    } else if (requiredTier === 'enterprise' && tier !== 'enterprise') {
        accessDenied = true;
    }

    // Check expiration
    if (isPremium && expiresAt && new Date(expiresAt) < new Date()) {
        accessDenied = true;
        // Auto-deactivate expired license
        try {
            await Guild.updateOne(
                { guildId },
                { $set: { 'premium.isActive': false, 'premium.tier': 'free' } }
            );
        } catch (e) {
            console.error('Failed to deactivate expired license:', e);
        }
    }

    if (accessDenied) {
        const tierName = requiredTier.charAt(0).toUpperCase() + requiredTier.slice(1);
        const icon = requiredTier === 'enterprise' ? '👑' : '✨';
        const color = requiredTier === 'enterprise' ? 'enterprise' : 'premium';
        
        // Build feature list
        const features = TIER_FEATURES[requiredTier];
        const featureList = [
            features.maxStaff !== Infinity ? `• Up to **${features.maxStaff}** staff members` : '• **Unlimited** staff members',
            `• **${features.maxStorageDays}** days of data retention`,
            `• **${features.analyticsDepth.charAt(0).toUpperCase() + features.analyticsDepth.slice(1)}** analytics`,
            features.automation ? '• **Automation** features included' : null,
            features.predictions ? '• **AI Predictions** & forecasting' : null,
            features.visualReports ? '• **Visual reports** & charts' : null
        ].filter(Boolean);

        const embed = await createCustomEmbed(interaction, {
            title: `${icon} ${tierName} Feature Locked`,
            thumbnail: interaction.guild?.iconURL?.({ dynamic: true }),
            description: [
                '### 🔐 Premium Access Required',
                `This command requires an active **${tierName}** subscription.`,
                '',
                '**Your Current Plan:**',
                tier === 'free' ? '`🔴 Free Tier`' : tier === 'premium' ? '`🟡 Premium Tier`' : '`🟢 Enterprise Tier`',
                '',
                `**${tierName} Includes:**`,
                featureList.join('\n')
            ].join('\n'),
            fields: [
                { 
                    name: '📊 Tier Comparison', 
                    value: 'Use `/buy` to see all available tiers and features', 
                    inline: false 
                }
            ],
            footer: `${tierName} License Enforcement • uwu-chan SaaS`,
            color: color
        });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel(`Upgrade to ${tierName}`)
                .setStyle(ButtonStyle.Link)
                .setURL('https://discord.gg/uwuchan')
                .setEmoji(icon),
            new ButtonBuilder()
                .setLabel('View Features')
                .setStyle(ButtonStyle.Secondary)
                .setCustomId('view_premium_features')
                .setEmoji('📋'),
            new ButtonBuilder()
                .setLabel('Contact Sales')
                .setStyle(ButtonStyle.Link)
                .setURL('https://discord.gg/uwuchan')
                .setEmoji('💬')
        );

        return { allowed: false, embed, components: [row] };
    }

    // Return feature limits for the current tier
    const featureLimits = TIER_FEATURES[tier] || TIER_FEATURES.free;

    return { 
        allowed: true, 
        guildData,
        tier,
        featureLimits
    };
}

/**
 * Validates if a specific feature is available for the guild's tier
 * @param {Object} interaction - The command interaction
 * @param {string} feature - Feature name
 * @returns {Promise<{ allowed: boolean, embed?: object, components?: object[] }>}
 */
async function validateFeatureAccess(interaction, feature) {
    const guildId = interaction.guildId;
    const guildData = await Guild.findOne({ guildId }).lean();
    const tier = guildData?.premium?.tier || 'free';
    const features = TIER_FEATURES[tier];
    
    const featureMap = {
        'automation': features.automation,
        'predictions': features.predictions,
        'visualReports': features.visualReports,
        'advancedAnalytics': features.analyticsDepth === 'advanced' || features.analyticsDepth === 'full',
        'fullAnalytics': features.analyticsDepth === 'full'
    };
    
    if (featureMap[feature] === false) {
        const requiredTier = feature === 'automation' ? 'premium' : 
                           feature === 'predictions' ? 'enterprise' :
                           feature === 'visualReports' ? 'premium' :
                           feature === 'advancedAnalytics' ? 'premium' :
                           feature === 'fullAnalytics' ? 'enterprise' : 'premium';
        
        return validatePremiumLicense(interaction, requiredTier);
    }
    
    return { allowed: true, guildData, tier, features };
}

/**
 * Checks if the guild has reached staff limit
 * @param {Object} interaction - The command interaction
 * @returns {Promise<{ allowed: boolean, embed?: object }>}
 */
async function checkStaffLimit(interaction) {
    const guildId = interaction.guildId;
    const guildData = await Guild.findOne({ guildId }).lean();
    const tier = guildData?.premium?.tier || 'free';
    const limit = TIER_FEATURES[tier].maxStaff;
    
    // Count current staff - users with staff data in this guild
    const { User } = require('../database/mongo');
    const staffCount = await User.countDocuments({
        'guilds.guildId': guildId,
        'guilds.staff': { $exists: true }
    });
    
    if (staffCount >= limit) {
        const nextTier = tier === 'free' ? 'premium' : 'enterprise';
        const nextLimit = TIER_FEATURES[nextTier].maxStaff;
        
        const embed = await createCustomEmbed(interaction, {
            title: '⚠️ Staff Limit Reached',
            description: [
                `Your **${tier.toUpperCase()}** plan allows **${limit}** staff members.`,
                `Current staff count: **${staffCount}** / **${limit}**`,
                '',
                `Upgrade to **${nextTier.toUpperCase()}** for up to **${nextLimit === Infinity ? 'unlimited' : nextLimit}** staff members.`
            ].join('\n'),
            color: 'warning'
        });
        
        return { allowed: false, embed };
    }
    
    return { allowed: true, currentCount: staffCount, limit };
}

module.exports = {
    VERSION_TIER_MAP,
    TIER_FEATURES,
    getRequiredTier,
    hasTierAccess,
    validatePremiumLicense,
    validateFeatureAccess,
    checkStaffLimit
};
