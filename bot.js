const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const mongoose = require('mongoose');

// STEP 1: Initialize the Discord Client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
    ]
});

// STEP 3: Define database model for Welcome Settings
// Using Mongoose as a common choice for your bots
const WelcomeSchema = new mongoose.Schema({
    serverId: String,
    channelId: String,
    message: String,
    enabled: Boolean
});
const WelcomeSettings = mongoose.model('WelcomeSettings', WelcomeSchema);

// STEP 3: Bot Event Listener - guildMemberAdd
client.on('guildMemberAdd', async (member) => {
    try {
        // Query the database for that server's welcome config
        const settings = await WelcomeSettings.findOne({ serverId: member.guild.id });

        if (settings && settings.enabled) {
            const channel = await client.channels.fetch(settings.channelId);
            if (channel) {
                // Replace placeholders: {user}, {server}, {membercount}
                let welcomeMessage = settings.message
                    .replace(/{user}/g, member.user.toString())
                    .replace(/{server}/g, member.guild.name)
                    .replace(/{membercount}/g, member.guild.memberCount);

                const embed = new EmbedBuilder()
                    .setTitle(`Welcome to ${member.guild.name}!`)
                    .setDescription(welcomeMessage)
                    .setColor(0x00FF00); // Premium Green

                await channel.send({ embeds: [embed] });
                console.log(`[Bot] Sent welcome message to ${member.user.tag}`);
            }
        }
    } catch (error) {
        console.error('[Bot] Error in guildMemberAdd:', error);
    }
});

client.once('ready', () => {
    console.log(`[Bot] Logged in as ${client.user.tag}!`);
});

// STEP 1: Export the client instance so server.js can share it
module.exports = { client, WelcomeSettings };
