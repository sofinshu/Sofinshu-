const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { validatePremiumLicense } = require('../../utils/enhancedPremiumGuard');
const { validatePremiumLicense } = require('../../utils/enhancedPremiumGuard');
const { createCustomEmbed, createErrorEmbed, createSuccessEmbed } = require('../../utils/enhancedEmbeds');
const { User } = require('../../database/mongo');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('v2_shop')
        .setDescription('🏪 Advanced high-fidelity Strategic Incentive Hub & Inventory System'),

    async execute(interaction) {
        try {
            const sent = await interaction.deferReply({ fetchReply: true, ephemeral: false });
            await renderShopMainPage(interaction, sent);
        } catch (error) {
            console.error('V2 Shop Error:', error);
            await interaction.editReply({ embeds: [createErrorEmbed('Incentive terminal failure: Unable to establish an encrypted connection.')] });
        }
    }
};

/**
 * Renders the main shop terminal interface
 */
async function renderShopMainPage(interaction, replyMessage) {
    const guildId = interaction.guildId;
    const userData = await User.findOne({ userId: interaction.user.id, guildId }).lean();

    if (!userData || !userData.staff) {
        return interaction.editReply({ embeds: [createErrorEmbed('Access denied: Personnel registry entry not found in the strategic database.')] });
    }

    const points = userData.staff.points || 0;

    // Simulate user "inventory" for demonstration purposes if not in DB
    const inventory = userData.staff.inventory || [];

    const embed = await createCustomEmbed(interaction, {
        title: '🏪 Strategic Incentive Terminal',
        thumbnail: interaction.client.user.displayAvatarURL({ dynamic: true }),
        description: `### 🛡️ Resource Allocation Matrix\nWelcome, \`${interaction.user.username}\`. Exchange your accumulated **Strategic Points** for premium enhancements and operational advantages.\n\n### 💳 Current Balance: \`${points.toLocaleString()} PTS\``,
        fields: [
            {
                name: '💎 [ULTRA] Tactical Flair — 500 PTS',
                value: inventory.includes('tactical_flair') ? '✅ *Already Owned*' : 'Unlock a permanent 🌟 icon on your staff passport.',
                inline: false
            },
            {
                name: '🎖️ [TITAN] Badge Frame — 1,000 PTS',
                value: inventory.includes('badge_frame') ? '✅ *Already Owned*' : 'Apply a special border to your profile card flairs.',
                inline: false
            },
            {
                name: '👑 [APEX] Custom Honorific — 5,000 PTS',
                value: inventory.includes('custom_title') ? '✅ *Already Owned*' : 'Override your rank with a custom tactical title.',
                inline: false
            }
        ],
        footer: 'Strategic incentives are permanently bound to your ID hash upon purchase.',
        color: 'enterprise'
    });

    const hasFlair = inventory.includes('tactical_flair');
    const hasFrame = inventory.includes('badge_frame');
    const hasTitle = inventory.includes('custom_title');

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('buy_flair')
            .setLabel(hasFlair ? 'Owned' : 'Buy [ULTRA]')
            .setStyle(hasFlair ? ButtonStyle.Secondary : points >= 500 ? ButtonStyle.Success : ButtonStyle.Danger)
            .setDisabled(hasFlair || points < 500),
        new ButtonBuilder()
            .setCustomId('buy_frame')
            .setLabel(hasFrame ? 'Owned' : 'Buy [TITAN]')
            .setStyle(hasFrame ? ButtonStyle.Secondary : points >= 1000 ? ButtonStyle.Primary : ButtonStyle.Danger)
            .setDisabled(hasFrame || points < 1000),
        new ButtonBuilder()
            .setCustomId('buy_title')
            .setLabel(hasTitle ? 'Owned' : 'Buy [APEX]')
            .setStyle(hasTitle ? ButtonStyle.Secondary : points >= 5000 ? ButtonStyle.Danger : ButtonStyle.Secondary)
            .setDisabled(hasTitle || points < 5000),
        new ButtonBuilder()
            .setCustomId('view_inventory')
            .setLabel('🎒 Inspect Loadout')
            .setStyle(ButtonStyle.Secondary)
    );

    await interaction.editReply({ embeds: [embed], components: [row] });

    // --- Interaction Collector ---
    const collector = replyMessage.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 120000
    });

    collector.on('collect', async i => {
        if (i.user.id !== interaction.user.id) {
            return i.reply({ content: '❌ terminal locked to initiating user.', ephemeral: true });
        }

        if (i.customId === 'view_inventory') {
            await i.deferUpdate();
            await renderInventoryPage(interaction, replyMessage, inventory);
            return;
        }

        // Process Purchases
        await i.deferUpdate();
        await processTransaction(interaction, replyMessage, i.customId, points);
    });

    collector.on('end', () => {
        const expiredRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('exp').setLabel('Terminal Session Timeout').setStyle(ButtonStyle.Secondary).setDisabled(true)
        );
        interaction.editReply({ components: [expiredRow] }).catch(() => { });
    });
}

/**
 * Simulates a cool payment processing animation
 */
async function processTransaction(interaction, replyMessage, customId, currentPoints) {
    let cost = 0;
    let itemName = '';
    let itemKey = '';

    if (customId === 'buy_flair') { cost = 500; itemName = '💎 [ULTRA] Tactical Flair'; itemKey = 'tactical_flair'; }
    if (customId === 'buy_frame') { cost = 1000; itemName = '🎖️ [TITAN] Badge Frame'; itemKey = 'badge_frame'; }
    if (customId === 'buy_title') { cost = 5000; itemName = '👑 [APEX] Custom Honorific'; itemKey = 'custom_title'; }

    // 1. Initial Processing Embed
    const authEmbed = createCustomEmbed(interaction, {
        title: '🔐 Authenticating Transaction...',
        description: `Requesting allocation of \`${itemName}\` for \`${cost} PTS\`...\n\n\`[■■□□□□□□□□] 20%\``,
        color: 'warning'
    });

    // Clear buttons during processing so user doesn't spam click
    await interaction.editReply({ embeds: [await authEmbed], components: [] });

    // Simulate delay
    await new Promise(res => setTimeout(res, 1500));

    // 2. Secondary Processing Embed
    const writeEmbed = createCustomEmbed(interaction, {
        title: '💾 Writing to Database...',
        description: `Deducting funds and appending hash to your registry profile...\n\n\`[■■■■■■■■□□] 80%\``,
        color: 'info'
    });
    await interaction.editReply({ embeds: [await writeEmbed] });

    // Simulate delay
    await new Promise(res => setTimeout(res, 1200));

    // 3. Database Updates
    const guildId = interaction.guildId;
    await User.updateOne(
        { userId: interaction.user.id, guildId },
        {
            $inc: { 'staff.points': -cost },
            $push: { 'staff.inventory': itemKey }
        }
    );

    // 4. Success Output
    const successEmbed = createSuccessEmbed(
        '✅ Transaction Confirmed',
        `Successfully allocated \`${itemName}\` to your loadout.\n\n**New Balance:** \`${(currentPoints - cost).toLocaleString()} PTS\``
    );

    const backRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('return_shop').setLabel('⬅️ Return to Terminal').setStyle(ButtonStyle.Primary)
    );

    await interaction.editReply({ embeds: [successEmbed], components: [backRow] });

    // Re-bind just the return button
    const backCollector = replyMessage.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000, max: 1 });
    backCollector.on('collect', async i => {
        if (i.user.id !== interaction.user.id) return i.reply({ content: '❌', ephemeral: true });
        await i.deferUpdate();
        await renderShopMainPage(interaction, replyMessage); // Re-render main page (which refetches DB so points/inventory are updated)
    });
}

/**
 * Renders the users current inventory
 */
async function renderInventoryPage(interaction, replyMessage, inventory) {
    const invMap = {
        'tactical_flair': '💎 [ULTRA] Tactical Flair',
        'badge_frame': '🎖️ [TITAN] Badge Frame',
        'custom_title': '👑 [APEX] Custom Honorific'
    };

    const ownedList = inventory.length > 0
        ? inventory.map(item => `• ${invMap[item] || item}`).join('\n')
        : '*No enhancements allocated yet.*';

    // We use a Enterprise embed for a "cool" inventory interface
    const invEmbed = await createCustomEmbed(interaction, {
        title: '🎒 Active Personnel Loadout',
        description: `Confirmed authentications tied to \`${interaction.user.tag}\`:\n\n${ownedList}`,
        thumbnail: interaction.user.displayAvatarURL(),
        color: 'Enterprise',
        footer: 'Loadout inspection complete.'
    });

    const backRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('return_shop').setLabel('⬅️ Return to Terminal').setStyle(ButtonStyle.Primary)
    );

    await interaction.editReply({ embeds: [invEmbed], components: [backRow] });

    // Re-bind just the return button
    const backCollector = replyMessage.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000, max: 1 });
    backCollector.on('collect', async i => {
        if (i.user.id !== interaction.user.id) return i.reply({ content: '❌', ephemeral: true });
        await i.deferUpdate();
        await renderShopMainPage(interaction, replyMessage);
    });
}
