const express = require('express');
const axios = require('axios');
const db = require('../database/connection');
const { verifyDiscordToken } = require('./auth');
const { getBotApiConfig } = require('../utils/config');
const { client } = require('../bot');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const router = express.Router({ mergeParams: true });

// Available systems
const SYSTEMS = ['automod', 'welcome', 'goodbye', 'autorole', 'logging', 'antispam', 'tickets', 'leveling', 'economy', 'giveaways'];

// Get system configuration
router.get('/systems/:system', verifyDiscordToken, (req, res) => {
    try {
        const { guildId, system } = req.params;
        
        if (!SYSTEMS.includes(system)) {
            return res.status(404).json({ error: 'Unknown system' });
        }

        const config = db.prepare(`
            SELECT config_json as config, enabled
            FROM system_configs
            WHERE guild_id = ? AND system_type = ?
        `).get(guildId, system);

        if (!config) {
            return res.json(getDefaultSystemConfig(system));
        }

        const parsed = JSON.parse(config.config);
        
        // Inject enabled status from db back into the config object
        const result = { ...parsed, enabled: config.enabled === 1 };
        
        res.json(result);
    } catch (error) {
        console.error(`[Systems] Get ${req.params.system} error:`, error);
        res.status(500).json({ error: 'Failed to fetch system configuration' });
    }
});

// Update system configuration
router.patch('/systems/:system', verifyDiscordToken, async (req, res) => {
    try {
        const { guildId, system } = req.params;
        const data = req.body;
        
        if (!SYSTEMS.includes(system)) {
            return res.status(404).json({ error: 'Unknown system' });
        }

        // The frontend sends the payload exactly how it should be stored in the DB
        // For systems without an explicit 'enabled' toggle in the UI payload, assume they are enabled when configured (e.g., automod, autorole, logging)
        const enabled = data.enabled !== undefined ? data.enabled : true;
        
        // Remove enabled from config since we store it in a separate column
        const config = { ...data };
        delete config.enabled;

        const stmt = db.prepare(`
            INSERT INTO system_configs (guild_id, system_type, config_json, enabled)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(guild_id, system_type) DO UPDATE SET
                config_json = excluded.config_json,
                enabled = excluded.enabled,
                updated_at = CURRENT_TIMESTAMP
        `);

        stmt.run(guildId, system, JSON.stringify(config), enabled ? 1 : 0);
        console.log(`[Systems] ${guildId}: Saved ${system} (Enabled: ${enabled}). Config:`, JSON.stringify(config));

        // Sync to Bot API removed - Bot and Dashboard are now unified/single-process.
        // The bot instance running in this same process reads directly from the shared SQLite database.
        console.log(`[Systems] Adjusted ${system} config in database. Bot will pick up changes on next relevant event.`);


        // Log activity
        logActivity(guildId, req.discordUser?.id, `${system}_updated`, { enabled });

        // --- UNIFIED BOT ACTIONS (IMMEDIATE FEEDBACK) ---
        let actionMessage = `${system} configuration saved`;
        const guild = client.guilds.cache.get(guildId);
        
        if (enabled && guild && client.isReady()) {
            try {
                // TICKET PANEL
                if (system === 'tickets' && config.panelChannelId) {
                    const channel = await guild.channels.fetch(config.panelChannelId).catch(() => null);
                    if (channel) {
                        const embed = new EmbedBuilder()
                            .setTitle('Support Tickets')
                            .setDescription(config.openMessage || 'Click the button below to open a support ticket.')
                            .setColor(0x6c63ff)
                            .setFooter({ text: 'Powered by Strata' });

                        const row = new ActionRowBuilder().addComponents(
                            new ButtonBuilder()
                                .setCustomId('open_ticket')
                                .setLabel('Open Ticket')
                                .setEmoji('🎫')
                                .setStyle(ButtonStyle.Primary)
                        );

                        await channel.send({ embeds: [embed], components: [row] });
                        actionMessage = `✅ ${system} saved and panel posted to #${channel.name}!`;
                    }
                }

                // WELCOME PREVIEW
                else if (system === 'welcome' && config.channelId) {
                    const channel = await guild.channels.fetch(config.channelId).catch(() => null);
                    if (channel) {
                        const welcomeMsg = (config.message || 'Welcome {user} to {server}!')
                            .replace(/{user}/g, req.discordUser?.username || 'User')
                            .replace(/{server}/g, guild.name)
                            .replace(/{count}/g, guild.memberCount)
                            .replace(/{membercount}/g, guild.memberCount);

                        const embed = new EmbedBuilder()
                            .setTitle('🎉 New Member (Test)')
                            .setDescription(welcomeMsg)
                            .setColor(0x2ecc71)
                            .setFooter({ text: 'System Active - This is a test message' });

                        await channel.send({ embeds: [embed] });
                        actionMessage = `✅ ${system} saved and test message sent to #${channel.name}!`;
                    }
                }

                // GOODBYE PREVIEW
                else if (system === 'goodbye' && config.channelId) {
                    const channel = await guild.channels.fetch(config.channelId).catch(() => null);
                    if (channel) {
                        const goodbyeMsg = (config.message || '{user} has left {server}.')
                            .replace(/{user}/g, req.discordUser?.username || 'User')
                            .replace(/{server}/g, guild.name)
                            .replace(/{count}/g, guild.memberCount)
                            .replace(/{membercount}/g, guild.memberCount);

                        const embed = new EmbedBuilder()
                            .setTitle('👋 Member Left (Test)')
                            .setDescription(goodbyeMsg)
                            .setColor(0xe74c3c)
                            .setFooter({ text: 'System Active - This is a test message' });

                        await channel.send({ embeds: [embed] });
                        actionMessage = `✅ ${system} saved and test message sent to #${channel.name}!`;
                    }
                }

                // LOGGING INITIALIZATION
                else if (system === 'logging') {
                    const channels = [config.memberLogChannel, config.messageLogChannel, config.modLogChannel].filter(Boolean);
                    for (const chId of channels) {
                        const channel = await guild.channels.fetch(chId).catch(() => null);
                        if (channel) {
                            await channel.send({ 
                                embeds: [new EmbedBuilder().setDescription(`📑 **Logging system updated and active.**`).setColor(0x5865F2)] 
                            }).catch(() => null);
                        }
                    }
                    actionMessage = `✅ Logging settings saved and test logs sent.`;
                }

                // LEVELING ANNOUNCEMENT
                else if (system === 'leveling' && config.channelId) {
                    const channel = await guild.channels.fetch(config.channelId).catch(() => null);
                    if (channel) {
                        await channel.send({ 
                            embeds: [new EmbedBuilder()
                                .setTitle('✨ Leveling Active')
                                .setDescription(`The leveling system has been enabled!\n**Preview:** ${config.message || 'GG {user}, you leveled up!'}`)
                                .setColor(0xf1c40f)] 
                        });
                        actionMessage = `✅ Leveling saved and announced in #${channel.name}!`;
                    }
                }

            } catch (botErr) {
                console.error(`[Bot] ${guildId}: Discord action error:`, botErr.message);
                actionMessage = `⚠️ ${system} saved, but bot action failed: ${botErr.message}`;
            }
        } else if (enabled && !guild) {
            actionMessage = `⚠️ ${system} saved, but bot is NOT in this server! Invite it first.`;
        } else if (enabled && !client.isReady()) {
            actionMessage = `⚠️ ${system} saved, but Discord is connecting. Bot will sync shortly.`;
        }

        const debugInfo = `(System: ${system}, Enabled: ${enabled}, HasChannel: ${!!(config.panelChannelId || config.channelId)})`;
        res.json({ 
            success: true, 
            message: `${actionMessage} ${debugInfo}`,
            debug: { system, enabled, actionMessage }
        });
    } catch (error) {
        console.error(`[Systems] Update ${req.params.system} error:`, error);
        res.status(500).json({ error: 'Failed to update system configuration' });
    }
});

// Helper function to get default config for each system
function getDefaultSystemConfig(system) {
    const defaults = {
        automod: {
            blockProfanity: false,
            blockLinks: false,
            antiMentionSpam: false,
            blockInvites: false,
            autoTimeout: false,
            logViolations: false,
            bannedWords: [],
            allowedDomains: [],
            maxMentions: 5,
            timeoutDuration: 10,
            logChannel: ''
        },
        welcome: {
            enabled: false,
            channelId: '',
            message: 'Welcome {user} to {server}! You are member #{count}.',
            dmEnabled: false,
            dmMessage: 'Thanks for joining {server}! Read the rules and enjoy your stay.'
        },
        goodbye: {
            enabled: false,
            channelId: '',
            message: '{user} has left {server}. We now have {count} members.',
            dmEnabled: false,
            dmMessage: ''
        },
        leveling: {
            enabled: false,
            minXp: 15,
            maxXp: 25,
            cooldown: 60,
            channelId: '',
            message: 'GG {user}, you just leveled up to **Level {level}**!',
            dmEnabled: false,
            excludedRoles: [],
            excludedChannels: []
        },
        autorole: {
            joinEnabled: false,
            joinRoleId: '',
            botEnabled: false,
            botRoleId: ''
        },
        logging: {
            memberLog: false,
            memberLogChannel: '',
            messageLog: false,
            messageLogChannel: '',
            modLog: false,
            modLogChannel: '',
            roleLog: false,
            roleLogChannel: '',
            voiceLog: false,
            voiceLogChannel: ''
        },
        antispam: {
            enabled: false,
            maxMessagesPerWindow: 5,
            action: 'delete',
            ignoreStaff: true,
            filterDuplicates: true,
            logChannel: ''
        },
        economy: {
            enabled: true,
            currencyName: 'Credits',
            currencySymbol: '💰',
            startingBalance: 0,
            multiplier: 1.0
        },
        tickets: {
            enabled: false,
            panelChannelId: '',
            categoryId: '',
            supportRoleId: '',
            openMessage: 'Welcome to your ticket! A staff member will assist you shortly.',
            transcriptsEnabled: true,
            transcriptChannelId: '',
            maxOpenPerUser: 1
        },
        giveaways: {
            enabled: false,
            announcementChannelId: '',
            defaultDurationMinutes: 1440, // 24 hours
            mentionRole: ''
        }
    };

    return defaults[system] || {};
}


function logActivity(guildId, userId, actionType, metadata) {
    try {
        const stmt = db.prepare(`
            INSERT INTO activity_logs (guild_id, user_id, action_type, metadata)
            VALUES (?, ?, ?, ?)
        `);
        stmt.run(guildId, userId, actionType, JSON.stringify(metadata));
    } catch (e) {
        console.error('[Activity Log] Error:', e);
    }
}

module.exports = router;
