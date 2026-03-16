const { Client, GatewayIntentBits, ActivityType } = require('discord.js');
const Database = require('better-sqlite3');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildModeration
    ]
});

// Use shared database connection
const db = require('./database/connection');

// --- HELPER: GET SYSTEM CONFIG ---
function getSystemConfig(guildId, systemType) {
    try {
        const row = db.prepare('SELECT config_json, enabled FROM system_configs WHERE guild_id = ? AND system_type = ?').get(guildId, systemType);
        if (row && row.enabled) {
            return JSON.parse(row.config_json);
        }
    } catch (e) {
        console.error(`[Bot] Error fetching ${systemType} config:`, e);
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
                .setTitle(`🎉 Welcome to ${member.guild.name}!`)
                .setDescription(welcomeMsg)
                .setColor(0x6c63ff)
                .setThumbnail(member.user.displayAvatarURL())
                .setFooter({ text: 'Powered by Strata' });

            if (welcome.channelId) {
                const channel = await client.channels.fetch(welcome.channelId).catch(() => null);
                if (channel) await channel.send({ embeds: [embed] }).catch(() => null);
            }

            if (welcome.dmEnabled) {
                const dmEmbed = new EmbedBuilder()
                    .setTitle(`Welcome to ${member.guild.name}`)
                    .setDescription(welcome.dmMessage || welcomeMsg)
                    .setColor(0x6c63ff);
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
            .setDescription(`${member.user.tag} (${member.id})`)
            .setColor(0x2ecc71)
            .setFooter({ text: `Member #${member.guild.memberCount}` });
        await sendLog(member.guild, 'member', logEmbed);

    } catch (error) {
        console.error('[Bot] Error in guildMemberAdd:', error);
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

// --- SYSTEM: MESSAGE HANDLER (LEVELING, AUTOMOD, COMMANDS) ---
const xpCooldowns = new Set();
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    const guildId = message.guild.id;
    const userId = message.author.id;
    const { EmbedBuilder } = require('discord.js');

    // 1. AUTOMOD
    const automod = getSystemConfig(guildId, 'automod');
    if (automod) {
        let violation = false;
        let reason = '';

        if (automod.blockLinks && /https?:\/\/\S+/.test(message.content)) {
            const isAllowed = (automod.allowedDomains || []).some(d => message.content.includes(d));
            if (!isAllowed) { violation = true; reason = 'Unauthorized Link'; }
        }

        if (automod.blockInvites && /(discord\.gg|discord\.com\/invite)\/\S+/.test(message.content)) {
            violation = true; reason = 'Discord Invite';
        }

        if (violation) {
            await message.delete().catch(() => null);
            if (automod.logViolations) {
                const logEmbed = new EmbedBuilder()
                    .setTitle('🚨 AutoMod Violation')
                    .addFields(
                        { name: 'User', value: `${message.author.tag} (${message.author.id})`, inline: true },
                        { name: 'Reason', value: reason, inline: true },
                        { name: 'Content', value: message.content.substring(0, 1024) }
                    )
                    .setColor(0xff4757);
                await sendLog(message.guild, 'mod', logEmbed);
            }
            return;
        }
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
                
                // Level = floor(sqrt(points/100))
                const oldLevel = Math.floor(Math.sqrt(oldPoints / 100));
                const newLevel = Math.floor(Math.sqrt(newPoints / 100));

                if (newLevel > oldLevel && newLevel > 0) {
                    const levelMsg = (leveling.message || 'GG {user}, you just leveled up to **Level {level}**!')
                        .replace(/{user}/g, message.author.toString())
                        .replace(/{level}/g, newLevel);
                    
                    const embed = new EmbedBuilder().setDescription(levelMsg).setColor(0xf1c40f);
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
                    const embed = new EmbedBuilder().setDescription(cmd.response).setColor(0x6c63ff);
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
        .setAuthor({ name: 'Message Deleted', iconURL: message.author.displayAvatarURL() })
        .setDescription(`**Channel:** ${message.channel.toString()}\n**Content:** ${message.content || '[No Content/Embed]'}`)
        .setColor(0xff4757);
    await sendLog(message.guild, 'message', embed);
});

client.on('messageUpdate', async (oldM, newM) => {
    if (!oldM.guild || oldM.author?.bot || oldM.content === newM.content) return;
    const { EmbedBuilder } = require('discord.js');
    const embed = new EmbedBuilder()
        .setAuthor({ name: 'Message Edited', iconURL: oldM.author.displayAvatarURL() })
        .setDescription(`**Channel:** ${oldM.channel.toString()}\n[Jump to Message](${newM.url})`)
        .addFields(
            { name: 'Before', value: oldM.content?.substring(0, 1024) || '[No Content]' },
            { name: 'After', value: newM.content?.substring(0, 1024) || '[No Content]' }
        )
        .setColor(0x3498db);
    await sendLog(oldM.guild, 'message', embed);
});

// --- SYSTEM: LOGGING (MEMBER EVENTS) ---
client.on('guildMemberUpdate', async (oldMember, newMember) => {
    const { EmbedBuilder } = require('discord.js');
    if (oldMember.nickname !== newMember.nickname) {
        const embed = new EmbedBuilder()
            .setAuthor({ name: 'Nickname Changed', iconURL: newMember.user.displayAvatarURL() })
            .setDescription(`${newMember.user.tag} (${newMember.id})`)
            .addFields(
                { name: 'Before', value: oldMember.nickname || 'None', inline: true },
                { name: 'After', value: newMember.nickname || 'None', inline: true }
            )
            .setColor(0xf1c40f);
        await sendLog(newMember.guild, 'member', embed);
    }
});

// --- CENTRAL INTERACTION HANDLER ---
client.on('interactionCreate', async (interaction) => {
    // Log every interaction received to help debug "application did not respond"
    console.log(`[Bot] Received interaction: ${interaction.type} (${interaction.commandName || interaction.customId}) from ${interaction.user.tag}`);

    // Handle Button Interactions (e.g., Tickets)
    if (interaction.isButton()) {
        if (interaction.customId === 'open_ticket') {
            try {
                await interaction.deferReply({ ephemeral: true });

                const settings = db.prepare('SELECT config_json FROM system_configs WHERE guild_id = ? AND system_type = ?').get(interaction.guild.id, 'tickets');
                if (!settings) return interaction.editReply('Ticket system is not configured in the dashboard.');

                const config = JSON.parse(settings.config_json);
                
                // Create the ticket channel
                const channel = await interaction.guild.channels.create({
                    name: `ticket-${interaction.user.username}`,
                    type: 0, // GuildText
                    parent: config.categoryId || null,
                    permissionOverwrites: [
                        { id: interaction.guild.id, deny: ['ViewChannel'] },
                        { id: interaction.user.id, allow: ['ViewChannel', 'SendMessages'] },
                        { id: config.supportRoleId, allow: ['ViewChannel', 'SendMessages'] }
                    ].filter(o => o.id)
                });

                await channel.send({ content: `${interaction.user.toString()}, ${config.openMessage || 'Welcome to your ticket!'}` });
                await interaction.editReply(`Ticket created: ${channel.toString()}`);
                console.log(`[Bot] Created ticket channel for ${interaction.user.tag}`);
            } catch (error) {
                console.error('[Bot] Error creating ticket:', error);
                await interaction.editReply('Failed to create ticket. Make sure the bot has "Manage Channels" permission.');
            }
        }
    }

    // Handle Slash Commands (Chat Input)
    if (interaction.isChatInputCommand()) {
        const { commandName } = interaction;
        console.log(`[Bot] Executing slash command: /${commandName}`);

        try {
            if (commandName === 'ping') {
                await interaction.reply(`🏓 Pong! Latency is ${Math.round(client.ws.ping)}ms.`);
            } else if (commandName === 'help') {
                await interaction.reply({
                    content: '👋 **Strata Staff Management Bot**\n\n- Use the dashboard to configure systems like Welcome, Tickets, and Moderation.\n- Visit your dashboard here: `https://strata-oksu.vercel.app` (or your Railway URL)\n\nAvailable commands: `/ping`, `/help` (more coming soon!)',
                    ephemeral: true
                });
            } else {
                // Generic response for unknown commands that might still be registered from a previous version
                await interaction.reply({
                    content: `The command \`/${commandName}\` is registered but not yet implemented in this unified version. Please use the dashboard for management!`,
                    ephemeral: true
                });
            }
        } catch (error) {
            console.error(`[Bot] Error executing /${commandName}:`, error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: 'There was an error executing this command!', ephemeral: true });
            }
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
