const express = require('express');
const mongoose = require('mongoose');
const { EmbedBuilder } = require('discord.js');
const client = require('./bot'); // Step 1: Import the shared client

const app = express();
const PORT = 3000;

app.use(express.json());

// Replace with your actual MongoDB connection string
const MONGODB_URI = 'mongodb://localhost:27017/discordbot';

// Define the WelcomeSettings model (same as in bot.js or imported)
const WelcomeSchema = new mongoose.Schema({
    serverId: String,
    channelId: String,
    message: String,
    enabled: Boolean
});
const WelcomeSettings = mongoose.model('WelcomeSettings', WelcomeSchema);

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

// Step 2: API ROUTE - SEND EMBED TO CHANNEL
app.post('/api/send-embed', async (req, res) => {
    try {
        const { serverId, channelId, title, description, color } = req.body;

        if (!serverId || !channelId || !title || !description) {
            return res.status(400).json({ success: false, error: "Missing required fields" });
        }

        const channel = await client.channels.fetch(channelId);
        if (!channel) {
            return res.status(404).json({ success: false, error: "Channel not found" });
        }

        const embed = new EmbedBuilder()
            .setTitle(title)
            .setDescription(description)
            .setColor(color || 0x0099FF); // Use provided color or default blue

        await channel.send({ embeds: [embed] });
        res.json({ success: true });
    } catch (error) {
        console.error('Error sending embed:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Step 3: API ROUTE - SAVE CONFIG TO DATABASE
app.post('/api/settings/welcome', async (req, res) => {
    try {
        const { serverId, channelId, message, enabled } = req.body;

        await WelcomeSettings.findOneAndUpdate(
            { serverId },
            { serverId, channelId, message, enabled },
            { upsert: true, new: true }
        );

        res.json({ success: true });
    } catch (error) {
        console.error('Error saving welcome settings:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Step 5: API ROUTE - GET SERVER CHANNELS
app.get('/api/servers/:serverId/channels', async (req, res) => {
    try {
        const { serverId } = req.params;
        const guild = await client.guilds.fetch(serverId);
        
        if (!guild) {
            return res.status(404).json({ success: false, error: "Server not found" });
        }

        // Get all text channels from the guild
        const channels = guild.channels.cache
            .filter(channel => channel.type === 0) // 0 is the type for GuildText
            .map(channel => ({ id: channel.id, name: channel.name }));

        res.json(channels);
    } catch (error) {
        console.error('Error fetching channels:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Step 6: API ROUTE - GET SERVER ROLES
app.get('/api/servers/:serverId/roles', async (req, res) => {
    try {
        const { serverId } = req.params;
        const guild = await client.guilds.fetch(serverId);

        if (!guild) {
            return res.status(404).json({ success: false, error: "Server not found" });
        }

        // Get all roles from the guild
        const roles = guild.roles.cache.map(role => ({
            id: role.id,
            name: role.name,
            color: role.hexColor
        }));

        res.json(roles);
    } catch (error) {
        console.error('Error fetching roles:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Start the Express server and login the bot
app.listen(PORT, () => {
    console.log(`Web server running on http://localhost:${PORT}`);
    
    // Step 1: Bot logs in within the same process
    // Note: Make sure to have DISCORD_TOKEN set in your environment variables
    client.login(process.env.DISCORD_TOKEN)
        .catch(err => console.error('Bot login failed:', err));
});
