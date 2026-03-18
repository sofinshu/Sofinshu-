const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

class StrataV2Module {
    constructor(client) {
        this.client = client;
        this.name = 'Strata V2 Core Settings & Commands';
        this.description = 'The 20 completely integrated slash commands built on Mongoose';
        this.tier = 'FREE';
        this.commands = [];

        this.init();
    }

    async init() {
        if (mongoose.connection.readyState === 0) {
            console.log('[StrataV2] Connecting to MongoDB for V2 core models...');
            const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/strata';
            await mongoose.connect(uri).catch(err => {
                const colors = require('discord.js').Colors;
                console.error('[StrataV2 ERROR] Failed to connect to MongoDB! Check MONGO_URI in .env', err);
            });
            console.log('[StrataV2] MongoDB connected successfully.');
        }

        const commandsPath = path.join(__dirname, 'commands');
        if (fs.existsSync(commandsPath)) {
            const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));
            for (const file of commandFiles) {
                try {
                    const command = require(path.join(commandsPath, file));
                    this.commands.push(command);
                    console.log(`[StrataV2] Injected Command: /${command.data.name}`);
                } catch (e) {
                    console.error(`[StrataV2 ERROR] Failed to load command ${file}:`, e);
                }
            }
        }
    }
}

module.exports = StrataV2Module;
