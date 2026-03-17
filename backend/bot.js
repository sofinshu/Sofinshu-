const { Client, GatewayIntentBits, ActivityType } = require('discord.js');
const Database = require('better-sqlite3');
const ModuleManager = require('./modules/ModuleManager');
const InteractionHandler = require('./utils/InteractionHandler');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildModeration
    ]
});

// Initialize Modular Framework
const interactionHandler = new InteractionHandler(client);
const moduleManager = new ModuleManager(client, interactionHandler);

// Load Modules asynchronously when the bot is getting ready
client.once('ready', async () => {
    await moduleManager.loadModules();
});

// Use shared database connection
const db = require('./database/connection');

// --- HELPER: GET SYSTEM CONFIG ---
function getSystemConfig(guildId, systemType) {
    try {
        const guildIdStr = String(guildId);
        let row = db.prepare('SELECT config_json, enabled FROM system_configs WHERE guild_id = ? AND system_type = ?').get(guildIdStr, systemType);
        
        // If not found as string, try as number (for compatibility)
        if (!row) {
            row = db.prepare('SELECT config_json, enabled FROM system_configs WHERE guild_id = ? AND system_type = ?').get(guildId, systemType);
        }
        
        if (row && row.enabled) {
            return JSON.parse(row.config_json);
        }
    } catch (e) {
        console.error(`[Bot] Error fetching ${systemType} config for guild ${guildId}:`, e);
    }
    return null;
}

// --- HELPER: SEND LOG ---
async function sendLog(guild, type, embed) {
    const config = getSystemConfig(guild.id, 'logging');
    if (!config) return;

    let channelId = '';
    if (type === 'member' && config.memberLog) channelId = config.memberLogChannel;
    if (type === 'message' && config.messageLog) channelId = config.messageLogChannel;
    if (type === 'mod' && config.modLog) channelId = config.modLogChannel;

    if (channelId) {
        const channel = await guild.channels.fetch(channelId).catch(() => null);
        if (channel) {
            embed.setTimestamp();
            await channel.send({ embeds: [embed] }).catch(() => null);
        }
    }
}

// --- SYSTEM: WELCOME & AUTO-ROLE ---
client.on('guildMemberAdd', async (member) => {
    try {
        const { EmbedBuilder } = require('discord.js');
        const guildId = member.guild.id;

        // 1. Welcome System
        const welcome = getSystemConfig(guildId, 'welcome');
        if (welcome) {
            const welcomeMsg = (welcome.message || 'Welcome {user} to {server}!')
                .replace(/{user}/g, member.user.toString())
                .replace(/{server}/g, member.guild.name)
                .replace(/{count}/g, member.guild.memberCount)
                .replace(/{membercount}/g, member.guild.memberCount);

            const embed = new EmbedBuilder()
                .setAuthor({ name: `ENTRY DETECTED • ${member.guild.name}`, iconURL: member.guild.iconURL({ dynamic: true }) })
                .setTitle(`WELCOME TO THE NEON DOMAIN`)
                .setDescription(welcomeMsg)
                .setColor(0x6c63ff) 
                .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 512 }))
                .addFields(
                    { name: '🆔 User Identity', value: `\`${member.user.tag}\``, inline: true },
                    { name: '📊 Server Capacity', value: `\`${member.guild.memberCount}\` Members`, inline: true },
                    { name: '⏳ Account Born', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: false }
                )
                .setImage('https://i.imgur.com/Atu9E8I.png') // Fixed Purple Banner
                .setFooter({ text: `STRATA PROTOCOL • SECURITY VERIFIED`, iconURL: client.user.displayAvatarURL() })
                .setTimestamp();

            if (welcome.channelId) {
                const channel = await client.channels.fetch(welcome.channelId).catch(() => null);
                if (channel) await channel.send({ content: `👋 **Attention ${member.user}!** A new connection has been established.`, embeds: [embed] }).catch(() => null);
            }

            if (welcome.dmEnabled) {
                const dmEmbed = new EmbedBuilder()
                    .setTitle(`CONNECTION ESTABLISHED: ${member.guild.name}`)
                    .setDescription(welcome.dmMessage || welcomeMsg)
                    .setColor(0x6c63ff)
                    .setFooter({ text: 'STRATA CORE SYSTEM' });
                await member.send({ embeds: [dmEmbed] }).catch(() => null);
            }
        }

        // 2. Auto-Role System
        const autorole = getSystemConfig(guildId, 'autorole');
        if (autorole) {
            const roleId = member.user.bot ? autorole.botRoleId : autorole.joinRoleId;
            const enabled = member.user.bot ? autorole.botEnabled : autorole.joinEnabled;
            
            if (enabled && roleId) {
                const role = member.guild.roles.cache.get(roleId);
                if (role) await member.roles.add(role).catch(() => null);
            }
        }

        // 3. Member Log
        const logEmbed = new EmbedBuilder()
            .setAuthor({ name: 'Member Joined', iconURL: member.user.displayAvatarURL() })
            .setDescription(`**${member.user.tag}** joined the server.`)
            .addFields(
                { name: 'User ID', value: `\`${member.id}\``, inline: true },
                { name: 'Account Age', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true }
            )
            .setColor(0x00e096) // Brand Green
            .setFooter({ text: `Total Members: ${member.guild.memberCount}` });
        await sendLog(member.guild, 'member', logEmbed);

    } catch (error) {
        console.error('[Bot] Error in guildMemberAdd:', error);
    }
});

// --- SYSTEM: GOODBYE ---
client.on('guildMemberRemove', async (member) => {
    try {
        const { EmbedBuilder } = require('discord.js');
        const guildId = member.guild.id;

        const goodbye = getSystemConfig(guildId, 'goodbye');
        if (goodbye && goodbye.channelId) {
            const goodbyeMsg = (goodbye.message || '{user} has left {server}.')
                .replace(/{user}/g, member.user.tag)
                .replace(/{server}/g, member.guild.name)
                .replace(/{count}/g, member.guild.memberCount)
                .replace(/{membercount}/g, member.guild.memberCount);

            const embed = new EmbedBuilder()
                .setAuthor({ name: 'DISCONNECTION DETECTED', iconURL: member.guild.iconURL() })
                .setTitle(`A VIBE HAS LEFT THE SERVER`)
                .setDescription(goodbyeMsg)
                .setColor(0xff4757) 
                .setThumbnail(member.user.displayAvatarURL())
                .addFields(
                    { name: '👤 Identity', value: `\`${member.user.tag}\``, inline: true },
                    { name: '📉 Remaining', value: `\`${member.guild.memberCount}\` Members`, inline: true }
                )
                .setFooter({ text: 'STRATA DISCONNECT LOG' });

            const channel = await client.channels.fetch(goodbye.channelId).catch(() => null);
            if (channel) await channel.send({ embeds: [embed] }).catch(() => null);
        }

        // Member Log
        const logEmbed = new EmbedBuilder()
            .setAuthor({ name: 'Member Left', iconURL: member.user.displayAvatarURL() })
            .setDescription(`**${member.user.tag}** has left the server.`)
            .addFields(
                { name: 'User ID', value: `\`${member.id}\``, inline: true },
                { name: 'Joined', value: member.joinedAt ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : 'Unknown', inline: true }
            )
            .setColor(0xff4757);
        await sendLog(member.guild, 'member', logEmbed);

    } catch (error) {
        console.error('[Bot] Error in guildMemberRemove:', error);
    }
});

// --- HELPER: GET OR CREATE MEMBER ---
function getOrCreateMember(guildId, userId, username) {
    try {
        let member = db.prepare('SELECT points FROM guild_members WHERE guild_id = ? AND user_id = ?').get(guildId, userId);
        if (!member) {
            db.prepare('INSERT INTO guild_members (guild_id, user_id, username) VALUES (?, ?, ?)').run(guildId, userId, username);
            return { points: 0 };
        }
        return member;
    } catch (e) {
        console.error('[Bot] DB Error in getOrCreateMember:', e);
        return { points: 0 };
    }
}

// --- SYSTEM: MESSAGE HANDLER (LEVELING, AUTOMOD, ANTISPAM, COMMANDS) ---
const xpCooldowns = new Set();
const spamTracker = new Map();

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    const guildId = message.guild.id;
    const userId = message.author.id;
    const { EmbedBuilder } = require('discord.js');

    // 1. ANTISPAM & AUTOMOD (Merged Protection)
    const antispam = getSystemConfig(guildId, 'antispam');
    const automod = getSystemConfig(guildId, 'automod');
    
    let violation = false;
    let reason = '';

    // Spam Check
    if (antispam) {
        const now = Date.now();
        const userData = spamTracker.get(`${guildId}-${userId}`) || { last: 0, count: 0 };
        if (now - userData.last < 2000) { // 2 second window
            userData.count++;
            if (userData.count > (antispam.maxMessagesPerWindow || 5)) {
                violation = true;
                reason = 'Excessive Spamming';
            }
        } else {
            userData.count = 1;
        }
        userData.last = now;
        spamTracker.set(`${guildId}-${userId}`, userData);
    }

    // Link/Invite Check
    if (!violation && automod) {
        if (automod.blockLinks && /https?:\/\/\S+/.test(message.content)) {
            const isAllowed = (automod.allowedDomains || []).some(d => message.content.includes(d));
            if (!isAllowed) { violation = true; reason = 'Unauthorized Link'; }
        }
        if (automod.blockInvites && /(discord\.gg|discord\.com\/invite)\/\S+/.test(message.content)) {
            violation = true; reason = 'Discord Invite';
        }
    }

    if (violation) {
        await message.delete().catch(() => null);
        const logEmbed = new EmbedBuilder()
            .setAuthor({ name: 'Shield Activated', iconURL: 'https://i.imgur.com/8S7X7f5.png' })
            .setTitle('Protection Violation Detected')
            .addFields(
                { name: '👤 User', value: `${message.author.tag}`, inline: true },
                { name: '🛡️ System', value: reason.includes('Spam') ? 'Anti-Spam' : 'Auto-Mod', inline: true },
                { name: '📝 Reason', value: `\`${reason}\``, inline: false },
                { name: '💬 Channel', value: message.channel.toString(), inline: true }
            )
            .setColor(0xff4757)
            .setTimestamp();
        await sendLog(message.guild, 'mod', logEmbed);
        return;
    }

    // 2. LEVELING
    const leveling = getSystemConfig(guildId, 'leveling');
    if (leveling && !leveling.excludedChannels?.includes(message.channel.id)) {
        const cooldownKey = `${guildId}-${userId}`;
        if (!xpCooldowns.has(cooldownKey)) {
            const xpToAdd = Math.floor(Math.random() * (leveling.maxXp - leveling.minXp + 1)) + leveling.minXp;
            try {
                const member = getOrCreateMember(guildId, userId, message.author.username);
                const oldPoints = member.points;
                const newPoints = oldPoints + xpToAdd;

                db.prepare('UPDATE guild_members SET points = ?, last_active_at = CURRENT_TIMESTAMP WHERE guild_id = ? AND user_id = ?').run(newPoints, guildId, userId);
                
                const oldLevel = Math.floor(Math.sqrt(oldPoints / 100));
                const newLevel = Math.floor(Math.sqrt(newPoints / 100));

                if (newLevel > oldLevel && newLevel > 0) {
                    const nextLevelXp = (newLevel + 1) * (newLevel + 1) * 100;
                    const progress = Math.min(Math.floor((newPoints / nextLevelXp) * 10), 10);
                    const progressBar = '▓'.repeat(progress) + '░'.repeat(10 - progress);

                    const levelMsg = (leveling.message || 'GG {user}, you just leveled up to **Level {level}**!')
                        .replace(/{user}/g, message.author.toString())
                        .replace(/{level}/g, newLevel);
                    
                    const embed = new EmbedBuilder()
                        .setAuthor({ name: 'LEVEL UP ACHIEVED!', iconURL: 'https://i.imgur.com/vH9YkYm.png' })
                        .setTitle('✨ STRATA EVOLUTION SYSTEM')
                        .setDescription(levelMsg)
                        .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
                        .addFields(
                            { name: '🏆 Milestone', value: `\`Rank: ELITE\``, inline: true },
                            { name: '⭐ New Level', value: `\`${newLevel}\``, inline: true },
                            { name: '📈 Evolution Progress', value: `\`[${progressBar}]\` (${newPoints}/${nextLevelXp} XP)`, inline: false }
                        )
                        .setColor(0xf1c40f)
                        .setFooter({ text: 'Powered by Strata Engagement Engine' });
                    
                    await message.channel.send({ embeds: [embed] }).catch(() => null);
                }

                xpCooldowns.add(cooldownKey);
                setTimeout(() => xpCooldowns.delete(cooldownKey), (leveling.cooldown || 60) * 1000);
            } catch (e) {
                console.error('[Bot] Leveling DB Error:', e);
            }
        }
    }

    // 3. CUSTOM COMMANDS
    try {
        const commands = db.prepare('SELECT * FROM custom_commands WHERE guild_id = ? AND enabled = 1').all(guildId);
        for (const cmd of commands) {
            let match = false;
            if (cmd.match_type === 'exact' && message.content.toLowerCase() === cmd.trigger.toLowerCase()) match = true;
            if (cmd.match_type === 'starts' && message.content.toLowerCase().startsWith(cmd.trigger.toLowerCase())) match = true;
            if (cmd.match_type === 'contains' && message.content.toLowerCase().includes(cmd.trigger.toLowerCase())) match = true;

            if (match) {
                db.prepare('UPDATE custom_commands SET usage_count = usage_count + 1 WHERE id = ?').run(cmd.id);
                if (cmd.is_embed) {
                    const embed = new EmbedBuilder()
                        .setAuthor({ name: 'Custom Command', iconURL: client.user.displayAvatarURL() })
                        .setDescription(cmd.response)
                        .setColor(0x6c63ff)
                        .setFooter({ text: `Triggered by ${message.author.tag}` });
                    await message.reply({ embeds: [embed] }).catch(() => null);
                } else {
                    await message.reply(cmd.response).catch(() => null);
                }
                break;
            }
        }
    } catch (e) {
        console.error('[Bot] Custom Commands Error:', e);
    }
});

// --- SYSTEM: LOGGING (MESSAGE EVENTS) ---
client.on('messageDelete', async (message) => {
    if (!message.guild || message.author?.bot) return;
    const { EmbedBuilder } = require('discord.js');
    const embed = new EmbedBuilder()
        .setAuthor({ name: 'SECURITY ALERT: CONTENT DESTRUCTION', iconURL: 'https://i.imgur.com/8S7X7f5.png' })
        .setTitle('🚨 DATA BREACH PREVENTED')
        .addFields(
            { name: '👤 Operator', value: `${message.author.tag}`, inline: true },
            { name: '📍 Sector', value: message.channel.toString(), inline: true },
            { name: '📝 Recovered Data', value: `\`\`\`${message.content?.substring(0, 800) || '[ENCRYPTED/EMPTY]'}\`\`\`` }
        )
        .setColor(0xff4757)
        .setFooter({ text: 'STRATA NEURAL LOG • INCIDENT RECORDED' })
        .setTimestamp();
    await sendLog(message.guild, 'message', embed);
});

client.on('messageUpdate', async (oldM, newM) => {
    if (!oldM.guild || oldM.author?.bot || oldM.content === newM.content) return;
    const { EmbedBuilder } = require('discord.js');
    const embed = new EmbedBuilder()
        .setAuthor({ name: 'SECURITY ALERT: CONTENT MODIFICATION', iconURL: 'https://i.imgur.com/8S7X7f5.png' })
        .setTitle('📝 DATA TRACE DETECTED')
        .setDescription(`[Jump to Incident Point](${newM.url})`)
        .addFields(
            { name: '⏪ Previous State', value: `\`\`\`${oldM.content?.substring(0, 450) || '[EMPTY]'}\`\`\`` },
            { name: '⏩ Current State', value: `\`\`\`${newM.content?.substring(0, 450) || '[EMPTY]'}\`\`\`` }
        )
        .setColor(0x3498db)
        .setFooter({ text: 'STRATA NEURAL LOG • MODIFICATION TRACKED' })
        .setTimestamp();
    await sendLog(oldM.guild, 'message', embed);
});

// --- SYSTEM: LOGGING (MEMBER EVENTS) ---
client.on('guildMemberUpdate', async (oldMember, newMember) => {
    const { EmbedBuilder } = require('discord.js');
    if (oldMember.nickname !== newMember.nickname) {
        const embed = new EmbedBuilder()
            .setAuthor({ name: 'IDENTITY CORRECTION', iconURL: 'https://i.imgur.com/8S7X7f5.png' })
            .setTitle('👤 PROFILE ATTRIBUTE UPDATED')
            .addFields(
                { name: 'Member Identity', value: `${newMember.user.tag}`, inline: true },
                { name: 'Old Alias', value: `\`${oldMember.nickname || 'None'}\``, inline: true },
                { name: 'New Alias', value: `\`${newMember.nickname || 'None'}\``, inline: true }
            )
            .setColor(0x6c63ff)
            .setFooter({ text: 'STRATA SECURITY • IDENTITY VERIFIED' })
            .setTimestamp();
        await sendLog(newMember.guild, 'member', embed);
    }
});

// --- CENTRAL INTERACTION HANDLER ---
client.on('interactionCreate', async (interaction) => {
    // Log every interaction received to help debug "application did not respond"
    console.log(`[Bot] Received interaction: ${interaction.type} (${interaction.commandName || interaction.customId}) from ${interaction.user.tag}`);

    // Handle Button Interactions (e.g., Tickets, Giveaways)
    if (interaction.isButton()) {
        const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

        // TICKETS
        if (interaction.customId === 'open_ticket') {
            try {
                await interaction.deferReply({ ephemeral: true });

                const guildId = interaction.guild.id.toString();
                console.log(`[Bot] Ticket button clicked in guild: ${guildId}`);
                
                // Try to find the config - check both string and number formats for compatibility
                let settings = db.prepare('SELECT config_json FROM system_configs WHERE guild_id = ? AND system_type = ?').get(guildId, 'tickets');
                
                // If not found, try with just the ID (in case it was stored differently)
                if (!settings) {
                    settings = db.prepare('SELECT config_json FROM system_configs WHERE guild_id = ? AND system_type = ?').get(interaction.guild.id, 'tickets');
                }
                
                // Debug: log what's being queried
                if (!settings) {
                    console.error(`[Bot] Ticket config missing for guild ${guildId}`);
                    // Debug: list what guilds ARE in the DB
                    const existing = db.prepare('SELECT guild_id FROM system_configs WHERE system_type = ?').all('tickets');
                    console.log(`[Bot] Available ticket configs for guilds:`, existing.map(e => e.guild_id));
                    return interaction.editReply('❌ Ticket system is not configured in the dashboard for this server.');
                }

                const config = JSON.parse(settings.config_json);
                
                // Create the ticket channel
                const channel = await interaction.guild.channels.create({
                    name: `🎫-${interaction.user.username}`,
                    type: 0, // GuildText
                    parent: config.categoryId || null,
                    permissionOverwrites: [
                        { id: interaction.guild.id, deny: ['ViewChannel'] },
                        { id: interaction.user.id, allow: ['ViewChannel', 'SendMessages'] },
                        { id: config.supportRoleId, allow: ['ViewChannel', 'SendMessages'] }
                    ].filter(o => o.id)
                });

                const welcomeEmbed = new EmbedBuilder()
                    .setAuthor({ name: 'ULTRA-SUPPORT PROTOCOL', iconURL: 'https://i.imgur.com/vH9YkYm.png' })
                    .setTitle('🚀 NEW TICKET INITIALIZED')
                    .setDescription(`Greetings **${interaction.user.tag}**,\n\n${config.openMessage || 'A specialized support agent will assist you shortly.'}`)
                    .addFields(
                        { name: '👤 Originator', value: interaction.user.toString(), inline: true },
                        { name: '🛡️ Support Tier', value: `<@&${config.supportRoleId || 'Support'}>`, inline: true },
                        { name: '📂 Subject', value: 'Server Query', inline: true }
                    )
                    .setColor(0x6c63ff)
                    .setImage('https://i.imgur.com/Atu9E8I.png') // Fixed Purple Banner
                    .setFooter({ text: 'STRATA TICKET CORE • PLEASE WAIT FOR STAFF RESPONSE', iconURL: client.user.displayAvatarURL() });

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('close_ticket')
                        .setLabel('Close Connection')
                        .setEmoji('🔒')
                        .setStyle(ButtonStyle.Danger)
                );

                await channel.send({ content: `${interaction.user.toString()} | <@&${config.supportRoleId || ''}>`, embeds: [welcomeEmbed], components: [row] });
                await interaction.editReply(`✅ **Secure connection established:** ${channel.toString()}`);
            } catch (error) {
                console.error('[Bot] Error creating ticket:', error);
                await interaction.editReply('❌ Failed to create ticket. Verify bot permissions.');
            }
        }

        // CLOSE TICKET
        if (interaction.customId === 'close_ticket') {
            try {
                await interaction.reply({ content: '⚠️ **Closing protocol initiated...** This channel will be purged in 5 seconds.', ephemeral: false });
                setTimeout(() => interaction.channel.delete().catch(() => null), 5000);
            } catch (e) {
                console.error('[Bot] Ticket Close Error:', e);
            }
        }

        // GIVEAWAYS (Simple Entry Logic)
        if (interaction.customId.startsWith('enter_giveaway_')) {
            const giveawayId = interaction.customId.split('_').pop();
            try {
                // In a real app, this would check a DB. For now, we'll simulate the response.
                await interaction.reply({ content: '🎉 **Entry Confirmed!** You have been added to the pool. Good luck!', ephemeral: true });
            } catch (e) {
                console.error('[Bot] Giveaway Entry Error:', e);
            }
        }
    }

    // Handle Slash Commands (Chat Input)
    if (interaction.isChatInputCommand()) {
        const { commandName } = interaction;
        const { EmbedBuilder } = require('discord.js');

        try {
            if (commandName === 'ping') {
                const embed = new EmbedBuilder()
                    .setTitle('🏓 Connectivity Check')
                    .addFields(
                        { name: 'Gateway', value: `\`${Math.round(client.ws.ping)}ms\``, inline: true },
                        { name: 'API Latency', value: `\`${Date.now() - interaction.createdTimestamp}ms\``, inline: true }
                    )
                    .setColor(0x6c63ff);
                await interaction.reply({ embeds: [embed] });
            } else if (commandName === 'help') {
                const embed = new EmbedBuilder()
                    .setAuthor({ name: 'Strata Assistant', iconURL: client.user.displayAvatarURL() })
                    .setTitle('Information & Support')
                    .setDescription('Welcome to **Strata**, your ultimate community management partner. Use the dashboard to customize your server experience.')
                    .addFields(
                        { name: '🔗 Main Dashboard', value: '`https://strata-oksu.vercel.app`', inline: false },
                        { name: '📚 Commands', value: 'Use `/system` commands for management.', inline: true },
                        { name: '💡 Support', value: 'Join our [Discord Server](https://discord.gg/smNwftEhKe)', inline: true }
                    )
                    .setImage('https://i.imgur.com/vH9YkYm.png')
                    .setColor(0x6c63ff);
                await interaction.reply({ embeds: [embed], ephemeral: true });
            } else {
                await interaction.reply({
                    content: `The command \`/${commandName}\` is registered but not implemented in this unified version.`,
                    ephemeral: true
                });
            }
        } catch (error) {
            console.error(`[Bot] Error executing /${commandName}:`, error);
        }
    }
});
client.once('ready', () => {
    console.log(`[Bot] Logged in as ${client.user.tag}`);
    console.log(`[Bot] Serving ${client.guilds.cache.size} guilds:`);
    client.guilds.cache.forEach(g => console.log(` - ${g.name} (${g.id})`));
    
    client.user.setActivity('staff management', { type: ActivityType.Watching });

    // Sync existing guilds to database on startup
    if (db) {
        const stmt = db.prepare('INSERT OR IGNORE INTO guilds (id, name, tier) VALUES (?, ?, ?)');
        for (const guild of client.guilds.cache.values()) {
            stmt.run(guild.id, guild.name, 'free');
        }
        console.log('[Bot] Synced guilds to database');
    }
});

client.on('guildCreate', (guild) => {
    console.log(`[Bot] Joined guild: ${guild.name} (${guild.id})`);

    // Save to database when bot joins a server
    if (db) {
        try {
            db.prepare('INSERT OR REPLACE INTO guilds (id, name, tier) VALUES (?, ?, ?)').run(guild.id, guild.name, 'free');
            console.log(`[Bot] Added guild ${guild.name} to database`);
        } catch (err) {
            console.error('[Bot] Failed to save guild to database:', err.message);
        }
    }
});

client.on('guildDelete', (guild) => {
    console.log(`[Bot] Left guild: ${guild.name} (${guild.id})`);

    // Optionally remove from database when bot leaves
    // (commented out to preserve data if bot is re-added later)
    // if (db) {
    //     db.prepare('DELETE FROM guilds WHERE id = ?').run(guild.id);
    // }
});

console.log('[Bot] Starting boot process...');
const token = process.env.DISCORD_TOKEN;
if (token) {
    console.log('[Bot] Token found, attempting login...');
    client.login(token).then(() => {
        console.log('[Bot] Discord login trigger successful');
    }).catch(err => {
        console.error('[Bot] CRITICAL: Failed to login:', err.message);
        if (err.message.includes('TOKEN_INVALID')) {
            console.error('[Bot] The DISCORD_TOKEN in your Railway variables is INCORRECT!');
        }
    });
} else {
    console.error('[Bot] ERROR: DISCORD_TOKEN is missing from environment variables!');
    console.warn('[Bot] Bot will remain OFFLINE until you add the token in Railway settings.');
}

// Export client for use in other modules
module.exports = { client };
