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

// Initialize database
const dbPath = process.env.DB_PATH || './database/strata.db';
let db;
try {
    db = new Database(dbPath);
    console.log('[Bot] Database connected');
    
    // STEP 9: Initialize Welcome Settings table if it doesn't exist
    db.exec(`
        CREATE TABLE IF NOT EXISTS welcome_settings (
            serverId TEXT PRIMARY KEY,
            channelId TEXT,
            message TEXT,
            enabled INTEGER
        )
    `);
} catch (err) {
    console.error('[Bot] Database connection failed:', err.message);
}

// STEP 9: Welcome Message Listener
client.on('guildMemberAdd', async (member) => {
    try {
        if (!db) return;
        const settings = db.prepare('SELECT * FROM welcome_settings WHERE serverId = ?').get(member.guild.id);

        if (settings && settings.enabled) {
            const channel = await client.channels.fetch(settings.channelId);
            if (channel) {
                const { EmbedBuilder } = require('discord.js');
                let welcomeMessage = settings.message
                    .replace(/{user}/g, member.user.toString())
                    .replace(/{server}/g, member.guild.name)
                    .replace(/{membercount}/g, member.guild.memberCount);

                const embed = new EmbedBuilder()
                    .setTitle(`Welcome to ${member.guild.name}!`)
                    .setDescription(welcomeMessage)
                    .setColor(0x00FF00);

                await channel.send({ embeds: [embed] });
                console.log(`[Bot] Sent welcome message to ${member.user.tag}`);
            }
        }
    } catch (error) {
        console.error('[Bot] Error in guildMemberAdd:', error);
    }
});

client.once('ready', () => { // Changed from clientReady to ready (standard discord.js)
    console.log(`[Bot] Logged in as ${client.user.tag}`);
    console.log(`[Bot] Serving ${client.guilds.cache.size} guilds`);
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

const token = process.env.DISCORD_TOKEN;
if (token) {
    client.login(token).catch(err => {
        console.error('[Bot] Failed to login:', err.message);
    });
} else {
    console.warn('[Bot] DISCORD_TOKEN not set - bot will not connect to Discord');
}

// Export client for use in other modules
module.exports = { client };
