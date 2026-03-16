const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const mongoose = require('mongoose');

// Initialize the Discord Client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
    ]
});

// Step 3: API ROUTE - SAVE CONFIG TO DATABASE AND BOT READS IT LATER
// Mocking the WelcomeSettings model for the purpose of this example.
// In a real application, this would be in a separate models file.
const WelcomeSchema = new mongoose.Schema({
    serverId: String,
    channelId: String,
    message: String,
    enabled: Boolean
});
const WelcomeSettings = mongoose.model('WelcomeSettings', WelcomeSchema);

// Bot Event: guildMemberAdd
client.on('guildMemberAdd', async (member) => {
    try {
        // Query the database for that server's welcome config
        const settings = await WelcomeSettings.findOne({ serverId: member.guild.id });

        if (settings && settings.enabled) {
            const channel = await client.channels.fetch(settings.channelId);
            if (channel) {
                // Use placeholders like {user} {server} {membercount} and replace them
                let welcomeMessage = settings.message
                    .replace(/{user}/g, member.user.toString())
                    .replace(/{server}/g, member.guild.name)
                    .replace(/{membercount}/g, member.guild.memberCount);

                const embed = new EmbedBuilder()
                    .setTitle('Welcome to the Server!')
                    .setDescription(welcomeMessage)
                    .setColor(0x00FF00); // Green color

                channel.send({ embeds: [embed] });
                console.log(`Sent welcome message to ${member.user.tag} in ${member.guild.name}`);
            }
        }
    } catch (error) {
        console.error('Error in guildMemberAdd event:', error);
    }
});

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

// Step 1: Export the Discord client so server.js can share it
module.exports = client;
