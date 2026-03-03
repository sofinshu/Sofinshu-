const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { validatePremiumLicense } = require('../../utils/enhancedPremiumGuard');
const { validatePremiumLicense } = require('../../utils/enhancedPremiumGuard');
const { createCustomEmbed, createErrorEmbed } = require('../../utils/enhancedEmbeds');
const { Guild } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('alert_system')
    .setDescription('Configure custom alert rules mapped to this server')
    .addSubcommand(sub => sub.setName('add').setDescription('Add an alert')
      .addStringOption(opt => opt.setName('name').setDescription('Alert name').setRequired(true))
      .addStringOption(opt => opt.setName('condition').setDescription('Alert condition').setRequired(true)))
    .addSubcommand(sub => sub.setName('list').setDescription('List all alerts'))
    .addSubcommand(sub => sub.setName('remove').setDescription('Remove an alert')
      .addStringOption(opt => opt.setName('name').setDescription('Alert name').setRequired(true))),

  async execute(interaction) {
    try {
      await interaction.deferReply({ ephemeral: true });
      const subcommand = interaction.options.getSubcommand();

      if (!interaction.member.permissions.has('ManageGuild')) {
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_btn_alert_system').setLabel('� Sync Live Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [createErrorEmbed('You do not have the required `Manage Server` permission.')], components: [row] });
      }

      const guildId = interaction.guildId;
      let guildData = await Guild.findOne({ guildId });
      if (!guildData) {
        guildData = new Guild({ guildId, name: interaction.guild.name, ownerId: interaction.guild.ownerId });
      }

      if (!guildData.alerts) guildData.alerts = [];

      if (subcommand === 'add') {
        const name = interaction.options.getString('name');
        const condition = interaction.options.getString('condition');

        if (guildData.alerts.length >= 10) {
          const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_btn_alert_system').setLabel('� Sync Live Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [createErrorEmbed('Maximum operational alert capacity (10) has been reached for this sector.')], components: [row] });
        }

        guildData.alerts.push({ name, condition, createdBy: interaction.user.id });
        await guildData.save();

        const embed = await createCustomEmbed(interaction, {
          title: '? Alert Protocol Synchronized',
          description: `Successfully registered a new tactical listener rule within the **${interaction.guild.name}** monitoring grid.`,
          fields: [
            { name: '?? Rule Designation', value: `\`${name.toUpperCase()}\``, inline: true },
            { name: '?? Logic Condition', value: `\`${condition}\``, inline: true }
          ],
          color: 'success'
        });

        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_btn_alert_system').setLabel('� Sync Live Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [embed], components: [row] });
      }

      if (subcommand === 'list') {
        const list = guildData.alerts.map((a, i) => `> **${i + 1}.** \`${a.name}\` ? \`${a.condition}\``).join('\n');

        const embed = await createCustomEmbed(interaction, {
          title: '?? Active Operational Alerts',
          thumbnail: interaction.guild.iconURL({ dynamic: true }),
          description: guildData.alerts.length > 0
            ? `### ??? Monitoring Grid Status: ONLINE\nThe following listener rules are active in the **${interaction.guild.name}** sector:\n\n${list}`
            : '*No active alert protocols detected in the current sector.*',
          color: 'premium'
        });

        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_btn_alert_system').setLabel('� Sync Live Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [embed], components: [row] });
      }

      if (subcommand === 'remove') {
        const name = interaction.options.getString('name');
        const originalLength = guildData.alerts.length;

        guildData.alerts = guildData.alerts.filter(a => a.name !== name);

        if (guildData.alerts.length === originalLength) {
          const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_btn_alert_system').setLabel('� Sync Live Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [createErrorEmbed(`Search failed: No alert rule designated **${name}** exists.`)], components: [row] });
        }

        await guildData.save();

        const embed = await createCustomEmbed(interaction, {
          title: '??? Alert Protocol Terminated',
          description: `Successfully decommissioned the listener rule **${name}** from the operational grid.`,
          color: 'error'
        });

        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_btn_alert_system').setLabel('� Sync Live Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [embed], components: [row] });
      }

    } catch (error) {
      console.error('Alert System Error:', error);
      const errEmbed = createErrorEmbed('A database error occurred while modifying the alert configuration matrix.');
            if (interaction.deferred || interaction.replied) {
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_btn_alert_system').setLabel('� Sync Live Data').setStyle(ButtonStyle.Secondary));
            await return await interaction.editReply({ embeds: [errEmbed], components: [row] });
      } else {
        await interaction.editReply({ embeds: [errEmbed], ephemeral: true });
      }
    }
  }
};


