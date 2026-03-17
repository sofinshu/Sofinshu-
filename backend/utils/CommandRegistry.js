const fs = require('fs');
const path = require('path');
const { SlashCommandBuilder } = require('discord.js');

class CommandRegistry {
    constructor() {
        this.commands = [];
        this.loadFromRegistry();
    }

    loadFromRegistry() {
        try {
            const listPath = path.join(__dirname, '../data/extracted_commands.json');
            if (fs.existsSync(listPath)) {
                this.commands = JSON.parse(fs.readFileSync(listPath, 'utf8'));
            }
        } catch (error) {
            console.error('[CommandRegistry] Error loading commands:', error);
        }
    }

    /**
     * Organize 271 commands into logical groups to stay within Discord limits
     */
    getGroupedCommands() {
        const groups = {
            'mod': { desc: 'Moderation systems', cmds: [] },
            'staff': { desc: 'Staff management', cmds: [] },
            'points': { desc: 'Economy and points', cmds: [] },
            'ticket': { desc: 'Support tickets', cmds: [] },
            'apply': { desc: 'Application system', cmds: [] },
            'auto': { desc: 'Automation systems', cmds: [] },
            'shift': { desc: 'Work shifts', cmds: [] },
            'achievement': { desc: 'Achievements', cmds: [] },
            'giveaway': { desc: 'Giveaways', cmds: [] },
            'system': { desc: 'Core bot systems', cmds: [] }
        };

        const result = [];
        const topLevelThreshold = ['ping', 'help', 'ban', 'kick', 'warn', 'timeout', 'purge', 'balance', 'leaderboard', 'shift_start', 'shift_end'];
        
        // Track which commands we've handled
        const handledNames = new Set();

        // 1. Add top-level high-frequency commands
        for (const name of topLevelThreshold) {
            const cmd = this.commands.find(c => c.name === name);
            if (cmd) {
                result.push({
                    name: cmd.name,
                    description: cmd.desc || `Execute ${cmd.name} command`,
                    tier: cmd.tier
                });
                handledNames.add(name);
            }
        }

        // 2. Put the rest into subcommands
        for (const cmd of this.commands) {
            if (handledNames.has(cmd.name)) continue;

            let assigned = false;
            for (const [prefix, group] of Object.entries(groups)) {
                if (cmd.name.startsWith(prefix)) {
                    group.cmds.push(cmd);
                    assigned = true;
                    break;
                }
            }

            if (!assigned) {
                groups['system'].cmds.push(cmd);
            }
        }

        // 3. Convert groups to SlashCommandBuilders
        for (const [name, group] of Object.entries(groups)) {
            if (group.cmds.length === 0) continue;

            const builder = new SlashCommandBuilder()
                .setName(name)
                .setDescription(group.desc);

            // Discord limits to 25 subcommands per command. 
            // If we have more, we need to create deeper nesting or more groups.
            // For now, take the first 25 of each category.
            group.cmds.slice(0, 25).forEach(sc => {
                builder.addSubcommand(sub => 
                    sub.setName(sc.name.replace(`${name}_`, ''))
                        .setDescription(sc.desc || `Execute ${sc.name}`)
                );
            });

            result.push(builder.toJSON());
        }

        return result;
    }
}

module.exports = new CommandRegistry();
