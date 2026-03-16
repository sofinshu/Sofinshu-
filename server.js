const express = require('express');
const mongoose = require('mongoose');
const { EmbedBuilder } = require('discord.js');
const { client, WelcomeSettings } = require('./bot'); // STEP 1: Import the shared client and models

const app = express();
const PORT = process.env.PORT || 8080; // Changed default to 8080 for broader compatibility

// Middleware
app.use(express.json());

console.log('[Server] Starting unified backend...');

// Database Connection
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
    console.error('[Server] CRITICAL: MONGODB_URI is not defined in environment variables!');
    // Don't exit yet, let's see if we can still start the web server for health checks
} else {
    mongoose.connect(MONGODB_URI)
        .then(() => console.log('[Server] MongoDB connected successfully'))
        .catch(err => {
            console.error('[Server] MongoDB connection error:', err.message);
        });
}

// Model re-definition removed to prevent OverwriteModelError

// STEP 2: API ROUTE - SEND EMBED TO CHANNEL
app.post('/api/send-embed', async (req, res) => {
    try {
        const { serverId, channelId, title, description, color } = req.body;

        // Validation
        if (!channelId || !title || !description) {
            return res.status(400).json({ success: false, error: "Missing channelId, title, or description" });
        }

        const channel = await client.channels.fetch(channelId);
        if (!channel) {
            return res.status(404).json({ success: false, error: "Channel not found or bot lacks access" });
        }

        const embed = new EmbedBuilder()
            .setTitle(title)
            .setDescription(description)
            .setColor(color || 0x5865F2); // Blurple default

        await channel.send({ embeds: [embed] });
        res.json({ success: true });
    } catch (error) {
        console.error('[API] Error in /send-embed:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// STEP 3: API ROUTE - SAVE CONFIG TO DATABASE
app.post('/api/settings/welcome', async (req, res) => {
    try {
        const { serverId, channelId, message, enabled } = req.body;

        if (!serverId) {
            return res.status(400).json({ success: false, error: "Missing serverId" });
        }

        await WelcomeSettings.findOneAndUpdate(
            { serverId },
            { serverId, channelId, message, enabled },
            { upsert: true, new: true }
        );

        res.json({ success: true });
    } catch (error) {
        console.error('[API] Error in /settings/welcome:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// STEP 5: API ROUTE - GET SERVER CHANNELS
app.get('/api/servers/:serverId/channels', async (req, res) => {
    try {
        const { serverId } = req.params;
        const guild = await client.guilds.fetch(serverId);
        
        if (!guild) {
            return res.status(404).json({ success: false, error: "Server not found" });
        }

        // Get text channels only (type 0 is GuildText)
        const channels = guild.channels.cache
            .filter(c => c.type === 0)
            .map(c => ({ id: c.id, name: c.name }));

        res.json(channels);
    } catch (error) {
        console.error('[API] Error in /channels:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// STEP 6: API ROUTE - GET SERVER ROLES
app.get('/api/servers/:serverId/roles', async (req, res) => {
    try {
        const { serverId } = req.params;
        const guild = await client.guilds.fetch(serverId);

        if (!guild) {
            return res.status(404).json({ success: false, error: "Server not found" });
        }

        const roles = guild.roles.cache.map(r => ({
            id: r.id,
            name: r.name,
            color: r.hexColor
        }));

        res.json(roles);
    } catch (error) {
        console.error('[API] Error in /roles:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Start everything
app.listen(PORT, () => {
    console.log(`[Server] Web server running on http://localhost:${PORT}`);
    
    // STEP 1: Bot logs in from the same process
    const TOKEN = process.env.DISCORD_TOKEN;
    if (TOKEN) {
        client.login(TOKEN).catch(err => console.error('[Bot] Login failed:', err));
    } else {
        console.error('[Bot] No DISCORD_TOKEN found in environment variables!');
    }
});
