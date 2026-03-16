const { REST, Routes } = require('discord.js');
require('dotenv').config();

const commands = [
    {
        name: 'ping',
        description: 'Check the bot\'s latency'
    },
    {
        name: 'help',
        description: 'Get information about the bot and dashboard'
    }
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log('Started refreshing application (/) commands.');

        const client_id = process.env.CLIENT_ID; // Need to make sure this is set in Railway
        if (!client_id) {
            console.error('ERROR: CLIENT_ID environment variable is not set!');
            process.exit(1);
        }

        await rest.put(
            Routes.applicationCommands(client_id),
            { body: commands },
        );

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
})();
