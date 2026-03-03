const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createCustomEmbed, createErrorEmbed, createPremiumEmbed, createSuccessEmbed } = require('../../utils/embeds');
const { Activity } = require('../../database/mongo');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mod_notes_advanced')
    .setDescription('Access isolated advanced moderation notes and logs')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('Target specific user explicitly')
        .setRequired(false))
    .addIntegerOption(option =>
      option.setName('limit')
        .setDescription('Number of recent logs to index (Max 50)')
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(50)),

  async execute(interaction) {
    try {
      await interaction.deferReply();
      const guildId = interaction.guildId;
      const targetUser = interaction.options.getUser('user');
      const limit = interaction.options.getInteger('limit') || 20;

      const query = { guildId, type: { $in: ['warning', 'command'] } };
      if (targetUser) query.userId = targetUser.id;

      const notes = await Activity.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      if (notes.length === 0) {
        if (targetUser) {
          const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_v3_mod_notes_advanced').setLabel('� Sync Live Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [createErrorEmbed(`No moderation trace logs discovered for <@${targetUser.id}>.`)], components: [row] });
        }
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_v3_mod_notes_advanced').setLabel('� Sync Live Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [createErrorEmbed('No moderation logs have been recorded in this server yet.')], components: [row] });
      }

      const noteEntries = notes.map(note => {
        const type = note.type === 'warning' ? '?? Notice' : '?? Execution';
        const unixTime = Math.floor(new Date(note.createdAt).getTime() / 1000);

        let dataStr = note.data?.reason || note.data?.command || 'Empty Hash';
        if (dataStr.length > 60) dataStr = `${dataStr.substring(0, 60)}...`;

        return `> **${type}** ? \`${dataStr}\` (<t:${unixTime}:R>)`;
      });

      const totalWarnings = await Activity.countDocuments({ guildId, type: 'warning' });
      const totalCommands = await Activity.countDocuments({ guildId, type: 'command' });

      const embed = await createCustomEmbed(interaction, {
        title: `?? Advanced Logging Index`,
        description: targetUser
          ? `Filtering footprint records mapped to <@${targetUser.id}> in **${interaction.guild.name}**.`
          : `Reviewing the top ${notes.length} log vectors recorded within **${interaction.guild.name}**.`,
        thumbnail: targetUser ? targetUser.displayAvatarURL() : interaction.guild.iconURL({ dynamic: true }),
        fields: [
          { name: '?? Security Trace Index', value: noteEntries.join('\n') || '*Cache Error*', inline: false },
          { name: '? Total Authorized Invocations', value: `\`${totalCommands}\` Global Operations`, inline: true },
          { name: '?? Server Disciplinary Traces', value: `\`${totalWarnings}\` Global Warnings`, inline: true }
        ]
      });

      const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_v3_mod_notes_advanced').setLabel('� Sync Live Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [embed], components: [row] });

    } catch (error) {
      console.error('Mod Notes Advanced Error:', error);
      const errEmbed = createErrorEmbed('A database tracking error occurred iterating mod footprint history.');
      if (interaction.deferred || interaction.replied) {
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_v3_mod_notes_advanced').setLabel('� Sync Live Data').setStyle(ButtonStyle.Secondary));
            await return await interaction.editReply({ embeds: [errEmbed], components: [row] });
      } else {
        await interaction.editReply({ embeds: [errEmbed], ephemeral: true });
      }
    }
  }
};


