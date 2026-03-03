const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

// Enhanced color palette with cool gradients
const EMBED_COLORS = {
    // Primary colors
    primary: 0x5865F2,      // Discord blurple
    success: 0x43b581,      // Green
    error: 0xf04747,        // Red
    warning: 0xfaa61a,      // Yellow/Orange
    info: 0x3498db,         // Blue
    
    // Premium tier colors
    premium: 0xff73fa,      // Pink/Magenta
    premiumDark: 0x9b59b6,  // Purple
    enterprise: 0xf1c40f,   // Gold
    enterpriseDark: 0xf39c12, // Dark Gold
    
    // Cool accent colors
    coolBlue: 0x00d4ff,
    neonGreen: 0x39ff14,
    hotPink: 0xff006e,
    cyberPurple: 0x7209b7,
    electricOrange: 0xff6b35,
    
    // Dark theme
    dark: 0x2f3136,
    darker: 0x1a1a2e,
    void: 0x0f0f1a,
    
    // Free tier
    free: 0x5865F2,
    
    // Category colors
    moderation: 0xe74c3c,
    fun: 0xff69b4,
    utility: 0x3498db,
    economy: 0xf1c40f,
    music: 0x9b59b6,
    config: 0x95a5a6
};

// Tier-specific branding with enhanced visuals
const TIER_BRANDING = {
    free: { 
        color: 0x5865F2, 
        prefix: '🔹', 
        footer: 'uwu-chan • Free Tier',
        thumbnail: 'https://cdn.discordapp.com/emojis/1270443842255777792.webp?size=96'
    },
    premium: { 
        color: 0xff73fa, 
        prefix: '✨', 
        footer: 'uwu-chan • Premium Tier',
        thumbnail: 'https://cdn.discordapp.com/emojis/1270443847256793130.webp?size=96'
    },
    enterprise: { 
        color: 0xf1c40f, 
        prefix: '👑', 
        footer: 'uwu-chan • Enterprise Tier',
        thumbnail: 'https://cdn.discordapp.com/emojis/1270443852138930216.webp?size=96'
    }
};

// Category emojis mapping
const CATEGORY_EMOJIS = {
    moderation: '🛡️',
    fun: '🎮',
    anime: '🌸',
    utility: '🔧',
    economy: '💰',
    music: '🎵',
    config: '⚙️',
    staff: '👔',
    analytics: '📊',
    automation: '🤖',
    premium: '💎',
    info: 'ℹ️',
    general: '📌'
};

/**
 * Creates a visual progress bar with customizable characters
 * @param {number} percent - 0-100
 * @param {number} length - Bar character length
 * @param {string} filledChar - Character for filled portion
 * @param {string} emptyChar - Character for empty portion
 * @returns {string}
 */
function createProgressBar(percent, length = 15, filledChar = '█', emptyChar = '░') {
    const p = Math.min(Math.max(parseFloat(percent) || 0, 0), 100);
    const filled = Math.round((p / 100) * length);
    const empty = length - filled;
    return filledChar.repeat(filled) + emptyChar.repeat(empty);
}

/**
 * Creates a fancy progress bar with block characters
 * @param {number} percent - 0-100
 * @param {number} length - Bar length
 * @returns {string}
 */
function createFancyProgressBar(percent, length = 10) {
    const p = Math.min(Math.max(parseFloat(percent) || 0, 0), 100);
    const filled = Math.round((p / 100) * length);
    const blocks = ['▏', '▎', '▍', '▌', '▋', '▊', '▉', '█'];
    const fullBlocks = Math.floor(filled);
    const partialBlock = Math.round((filled - fullBlocks) * 7);
    
    let bar = '█'.repeat(fullBlocks);
    if (partialBlock > 0 && fullBlocks < length) {
        bar += blocks[partialBlock];
    }
    bar += '░'.repeat(Math.max(0, length - fullBlocks - (partialBlock > 0 ? 1 : 0)));
    
    return bar;
}

/**
 * Creates a tier-styled embed with consistent branding
 * @param {string} tier - 'free' | 'premium' | 'enterprise'
 * @param {Object} options - Embed options
 * @returns {EmbedBuilder}
 */
function createTierEmbed(tier = 'free', options = {}) {
    const brand = TIER_BRANDING[tier] || TIER_BRANDING.free;
    return createCoolEmbed({
        ...options,
        color: options.color || brand.color,
        title: options.title ? `${brand.prefix} ${options.title}` : options.title,
        thumbnail: options.thumbnail || brand.thumbnail,
        branding: {
            footer: options.footer || brand.footer,
            ...options.branding
        }
    });
}

/**
 * Creates a category-specific embed
 * @param {string} category - Category name
 * @param {Object} options - Embed options
 * @returns {EmbedBuilder}
 */
function createCategoryEmbed(category = 'general', options = {}) {
    const emoji = CATEGORY_EMOJIS[category] || '📌';
    const color = EMBED_COLORS[category] || EMBED_COLORS.primary;
    
    return createCoolEmbed({
        ...options,
        color: options.color || color,
        title: options.title ? `${emoji} ${options.title}` : options.title,
        branding: {
            footer: options.footer || `uwu-chan • ${category.charAt(0).toUpperCase() + category.slice(1)}`,
            ...options.branding
        }
    });
}

/**
 * Asynchronously generates a branded embed by fetching guild settings
 * @param {Object} interaction - The discord interaction
 * @param {Object} options - Options for the embed
 * @returns {Promise<EmbedBuilder>}
 */
async function createCustomEmbed(interaction, options = {}) {
    let guildBranding = {};

    if (interaction && interaction.guildId) {
        try {
            const { Guild } = require('../database/mongo');
            const guildData = await Guild.findOne({ guildId: interaction.guildId }).lean();
            if (guildData?.customBranding) {
                guildBranding = guildData.customBranding;
            }
        } catch (e) {
            console.error('Failed to fetch guild branding for embeds', e);
        }
    }

    if (!options.branding) options.branding = {};

    // Server theme overrides default styling if present
    if (guildBranding.color) options.branding.color = guildBranding.color;
    if (guildBranding.footer) options.branding.footer = guildBranding.footer;
    if (guildBranding.iconURL) options.branding.iconURL = guildBranding.iconURL;

    return createCoolEmbed(options);
}

/**
 * Creates a cool embed with all the bells and whistles
 * @param {Object} options - Embed options
 * @returns {EmbedBuilder}
 */
function createCoolEmbed(options = {}) {
    const embed = new EmbedBuilder();
    const branding = options.branding || {};

    // Set color
    let color = EMBED_COLORS.primary;
    if (branding.color) {
        color = branding.color;
    } else if (options.color) {
        color = EMBED_COLORS[options.color] || options.color;
    }
    embed.setColor(color);

    // Handle Custom Branding Footer
    const footerText = branding.footer || options.footer || null;
    const footerIcon = branding.iconURL || options.footerIcon || null;

    if (footerText && footerIcon) {
        embed.setFooter({ text: footerText, iconURL: footerIcon });
    } else if (footerText) {
        embed.setFooter({ text: footerText });
    } else if (footerIcon) {
        embed.setFooter({ text: '\u200B', iconURL: footerIcon });
    }

    // Always add timestamp
    embed.setTimestamp();

    // Set content
    if (options.title) embed.setTitle(options.title);
    if (options.description) embed.setDescription(options.description);
    if (options.url) embed.setURL(options.url);

    if (options.author) {
        const authorData = { name: options.author.name };
        if (options.author.iconURL) authorData.iconURL = options.author.iconURL;
        if (options.author.url) authorData.url = options.author.url;
        embed.setAuthor(authorData);
    }

    if (options.thumbnail) embed.setThumbnail(options.thumbnail);
    if (options.image) embed.setImage(options.image);

    if (options.fields && options.fields.length > 0) {
        // Validate field values aren't empty
        const validFields = options.fields.filter(f => f.name && f.value !== undefined && f.value !== null);
        embed.addFields(validFields);
    }

    return embed;
}

/**
 * Creates an error embed with cool styling
 * @param {string} message - Error message
 * @param {string} suggestion - Optional suggestion for fix
 * @returns {EmbedBuilder}
 */
function createErrorEmbed(message, suggestion = null) {
    const embed = createCoolEmbed({
        title: '❌ Error Occurred',
        description: message,
        color: 'error',
        footer: 'uwu-chan • Please try again or contact support'
    });
    
    if (suggestion) {
        embed.addFields({
            name: '💡 Suggestion',
            value: suggestion,
            inline: false
        });
    }
    
    return embed;
}

/**
 * Creates a success embed with celebration
 * @param {string} title - Success title
 * @param {string} message - Success message
 * @param {Object} extra - Extra fields or data
 * @returns {EmbedBuilder}
 */
function createSuccessEmbed(title, message, extra = {}) {
    const embed = createCoolEmbed({
        title: title ? `✅ ${title}` : '✅ Success!',
        description: message,
        color: 'success',
        footer: 'uwu-chan • Operation completed successfully'
    });
    
    if (extra.fields) {
        embed.addFields(extra.fields);
    }
    
    if (extra.thumbnail) {
        embed.setThumbnail(extra.thumbnail);
    }
    
    return embed;
}

/**
 * Creates a warning embed
 * @param {string} title - Warning title
 * @param {string} message - Warning message
 * @returns {EmbedBuilder}
 */
function createWarningEmbed(title, message) {
    return createCoolEmbed({
        title: title ? `⚠️ ${title}` : '⚠️ Warning',
        description: message,
        color: 'warning',
        footer: 'uwu-chan • Please review carefully'
    });
}

/**
 * Creates an info embed
 * @param {string} title - Info title
 * @param {string} message - Info message
 * @returns {EmbedBuilder}
 */
function createInfoEmbed(title, message) {
    return createCoolEmbed({
        title: title ? `ℹ️ ${title}` : 'ℹ️ Information',
        description: message,
        color: 'info',
        footer: 'uwu-chan • Good to know'
    });
}

/**
 * Creates a premium-styled embed
 * @param {Object} options - Embed options
 * @returns {EmbedBuilder}
 */
function createPremiumEmbed(options = {}) {
    return createTierEmbed('premium', {
        ...options,
        title: options.title || '✨ Premium Feature'
    });
}

/**
 * Creates an enterprise-styled embed
 * @param {Object} options - Embed options
 * @returns {EmbedBuilder}
 */
function createEnterpriseEmbed(options = {}) {
    return createTierEmbed('enterprise', {
        ...options,
        title: options.title || '👑 Enterprise Feature'
    });
}

/**
 * Creates a moderation embed
 * @param {string} action - Moderation action
 * @param {Object} data - Moderation data
 * @returns {EmbedBuilder}
 */
function createModerationEmbed(action, data = {}) {
    const actionEmojis = {
        ban: '🔨',
        kick: '👢',
        warn: '⚠️',
        mute: '🔇',
        unmute: '🔊',
        unban: '🔓',
        timeout: '⏱️'
    };
    
    const emoji = actionEmojis[action.toLowerCase()] || '🛡️';
    
    return createCoolEmbed({
        title: `${emoji} ${action.charAt(0).toUpperCase() + action.slice(1)}`,
        description: data.description || `Moderation action: ${action}`,
        color: 'moderation',
        fields: data.fields || [],
        thumbnail: data.target?.displayAvatarURL?.() || data.thumbnail,
        footer: `uwu-chan • Moderation Log • ${new Date().toLocaleDateString()}`
    });
}

/**
 * Creates an analytics embed
 * @param {string} title - Analytics title
 * @param {Object} data - Analytics data
 * @returns {EmbedBuilder}
 */
function createAnalyticsEmbed(title, data = {}) {
    const embed = createCoolEmbed({
        title: `📊 ${title}`,
        description: data.description || 'Analytics data',
        color: 'analytics',
        thumbnail: data.thumbnail,
        footer: 'uwu-chan • Analytics Dashboard'
    });
    
    if (data.fields) {
        embed.addFields(data.fields);
    }
    
    return embed;
}

/**
 * Creates a stat field object for use in embed.addFields()
 * @param {string} label - Field name
 * @param {string|number} value - Field value
 * @param {boolean} inline
 * @returns {{ name, value, inline }}
 */
function createStatField(label, value, inline = true) {
    return { 
        name: `${label}`, 
        value: `\`${String(value)}\``, 
        inline 
    };
}

/**
 * Creates a cool stat field with emoji
 * @param {string} emoji - Emoji prefix
 * @param {string} label - Field name
 * @param {string|number} value - Field value
 * @param {boolean} inline
 * @returns {{ name, value, inline }}
 */
function createEmojiStatField(emoji, label, value, inline = true) {
    return {
        name: `${emoji} ${label}`,
        value: `**${String(value)}**`,
        inline
    };
}

/**
 * Creates a paginated embed handler
 * @param {Object} interaction - Discord interaction
 * @param {Array} pages - Array of embed pages
 * @param {number} timeout - Collector timeout in ms
 */
async function createPaginatedEmbed(interaction, pages, timeout = 120000) {
    if (!pages || pages.length === 0) return;
    
    let currentPage = 0;
    
    const getRow = () => {
        return new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('prev_page')
                .setLabel('◀️ Previous')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(currentPage === 0),
            new ButtonBuilder()
                .setCustomId('page_counter')
                .setLabel(`${currentPage + 1} / ${pages.length}`)
                .setStyle(ButtonStyle.Primary)
                .setDisabled(true),
            new ButtonBuilder()
                .setCustomId('next_page')
                .setLabel('Next ▶️')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(currentPage === pages.length - 1)
        );
    };
    
    const message = await interaction.editReply({
        embeds: [pages[currentPage]],
        components: pages.length > 1 ? [getRow()] : []
    });
    
    if (pages.length <= 1) return;
    
    const collector = message.createMessageComponentCollector({
        filter: i => i.user.id === interaction.user.id,
        time: timeout
    });
    
    collector.on('collect', async i => {
        if (i.customId === 'prev_page') {
            currentPage = Math.max(0, currentPage - 1);
        } else if (i.customId === 'next_page') {
            currentPage = Math.min(pages.length - 1, currentPage + 1);
        }
        
        await i.update({
            embeds: [pages[currentPage]],
            components: [getRow()]
        });
    });
    
    collector.on('end', () => {
        message.edit({ components: [] }).catch(() => {});
    });
}

/**
 * Format number with commas
 * @param {number} num - Number to format
 * @returns {string}
 */
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Format duration in milliseconds to human readable string
 * @param {number} ms - Milliseconds
 * @returns {string}
 */
function formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
}

module.exports = {
    EMBED_COLORS,
    TIER_BRANDING,
    CATEGORY_EMOJIS,
    createProgressBar,
    createFancyProgressBar,
    createTierEmbed,
    createCategoryEmbed,
    createCustomEmbed,
    createCoolEmbed,
    createErrorEmbed,
    createSuccessEmbed,
    createWarningEmbed,
    createInfoEmbed,
    createPremiumEmbed,
    createEnterpriseEmbed,
    createModerationEmbed,
    createAnalyticsEmbed,
    createStatField,
    createEmojiStatField,
    createPaginatedEmbed,
    formatNumber,
    formatDuration
};
