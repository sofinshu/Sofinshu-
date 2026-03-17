const { checkGuildTier } = require('../middlewares/tierMiddleware');
const StrataEmbedBuilder = require('./EmbedBuilder');

class InteractionHandler {
    constructor(client) {
        this.client = client;
        this.commands = new Map();
        this.buttons = new Map();
        this.selectMenus = new Map();

        // Listen for interactions
        this.client.on('interactionCreate', async (interaction) => {
            try {
                await this.handleInteraction(interaction);
            } catch (error) {
                console.error('[InteractionHandler] Unknown Error:', error);
                
                // Fallback catch if the command failed mid-execution and hasn't replied
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({ 
                        ephemeral: true, 
                        content: '❌ An error occurred while executing this interaction.' 
                    }).catch(() => null);
                } else if (interaction.deferred) {
                    await interaction.editReply({
                        content: '❌ An error occurred while executing this interaction.' 
                    }).catch(() => null);
                }
            }
        });
    }

    registerCommand(command) {
        this.commands.set(command.data.name, command);
    }

    registerButton(button) {
        this.buttons.set(button.id, button);
    }

    registerSelectMenu(selectMenu) {
        this.selectMenus.set(selectMenu.id, selectMenu);
    }

    async handleInteraction(interaction) {
        if (!interaction.guild) return; // Ignore DMs

        // Handle Slash Commands
        if (interaction.isChatInputCommand()) {
            const command = this.commands.get(interaction.commandName);
            if (!command) return;

            // Tier requirements execution
            if (command.tier && command.tier !== 'free') {
                const tierCheck = checkGuildTier(interaction.guild.id, command.tier);
                if (!tierCheck.hasAccess) {
                    const embed = new StrataEmbedBuilder()
                        .setTheme('danger')
                        .setTitle('Premium Feature')
                        .setDescription(`This command requires **${command.tier.toUpperCase()}** tier.\nYour current tier is \`${tierCheck.currentTier.toUpperCase()}\`.`);
                        
                    return interaction.reply({ embeds: [embed], ephemeral: true });
                }
            }

            try {
                await command.execute(interaction, this.client);
            } catch (error) {
                console.error(`[InteractionHandler] Command Error (${command.data.name}):`, error);
                const msg = { content: '❌ Error explicitly thrown by command logic.', ephemeral: true };
                interaction.replied || interaction.deferred ? await interaction.editReply(msg).catch(()=>null) : await interaction.reply(msg).catch(()=>null);
            }
            return;
        }

        // Handle Button Interactions
        if (interaction.isButton()) {
            // Find an exact match or a dynamic match (like ticket_close_123 or enter_giveaway_xyz)
            let buttonObj = this.buttons.get(interaction.customId);
            
            if (!buttonObj) {
                // If specific ID isn't found, try matching by prefix
                for (const [key, btn] of this.buttons.entries()) {
                    if (interaction.customId.startsWith(key) && btn.dynamic) {
                        buttonObj = btn;
                        break;
                    }
                }
            }

            if (!buttonObj) return;

            if (buttonObj.tier && buttonObj.tier !== 'free') {
                const tierCheck = checkGuildTier(interaction.guild.id, buttonObj.tier);
                if (!tierCheck.hasAccess) {
                    return interaction.reply({ content: `❌ This interaction requires ${buttonObj.tier.toUpperCase()} tier.`, ephemeral: true });
                }
            }

            try {
                await buttonObj.execute(interaction, this.client);
            } catch (error) {
                console.error(`[InteractionHandler] Button Error (${interaction.customId}):`, error);
            }
            return;
        }

        // Handle Select Menu Interactions
        if (interaction.isAnySelectMenu()) {
            const menuObj = this.selectMenus.get(interaction.customId);
            if (!menuObj) return;

            if (menuObj.tier && menuObj.tier !== 'free') {
                const tierCheck = checkGuildTier(interaction.guild.id, menuObj.tier);
                if (!tierCheck.hasAccess) {
                    return interaction.reply({ content: `❌ This menu requires ${menuObj.tier.toUpperCase()} tier.`, ephemeral: true });
                }
            }
            
            try {
                await menuObj.execute(interaction, this.client);
            } catch (error) {
                console.error(`[InteractionHandler] SelectMenu Error (${interaction.customId}):`, error);
            }
        }
    }
}

module.exports = InteractionHandler;
