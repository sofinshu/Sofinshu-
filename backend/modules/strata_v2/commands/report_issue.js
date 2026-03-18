const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { Colors, FOOTER } = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('report_issue')
    .setDescription('Submit a bug report or feature request through modal form'),

  async execute(interaction) {
    const modal = new ModalBuilder()
      .setCustomId('report_issue_modal')
      .setTitle('🐛 Report an Issue');

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('issue_type').setLabel('Issue Type').setStyle(TextInputStyle.Short)
          .setPlaceholder('Bug / Feature Request / Feedback').setRequired(true).setMaxLength(50)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('issue_title').setLabel('Issue Title').setStyle(TextInputStyle.Short)
          .setPlaceholder('Brief summary of the issue').setRequired(true).setMaxLength(100)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('description').setLabel('Description').setStyle(TextInputStyle.Paragraph)
          .setPlaceholder('Describe the issue in detail...').setRequired(true).setMaxLength(1000)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('steps').setLabel('Steps to Reproduce').setStyle(TextInputStyle.Paragraph)
          .setPlaceholder('1. Run /command\n2. Click button...\n3. See error').setRequired(false).setMaxLength(500)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('priority').setLabel('Priority').setStyle(TextInputStyle.Short)
          .setPlaceholder('Low / Medium / High / Critical').setRequired(true).setMaxLength(20)
      )
    );

    await interaction.showModal(modal);
  },

  // Handle modal submission (called from interactionCreate)
  async handleModal(interaction) {
    const type  = interaction.fields.getTextInputValue('issue_type');
    const title = interaction.fields.getTextInputValue('issue_title');
    const desc  = interaction.fields.getTextInputValue('description');
    const steps = interaction.fields.getTextInputValue('steps');
    const prio  = interaction.fields.getTextInputValue('priority');

    // Generate ticket ID
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let ticketId = '#';
    for (let i = 0; i < 6; i++) ticketId += chars[Math.floor(Math.random() * chars.length)];

    const embed = new EmbedBuilder()
      .setColor(Colors.SUCCESS)
      .setTitle('✅ ISSUE REPORTED SUCCESSFULLY')
      .setDescription('Your report has been submitted and logged.')
      .addFields(
        { name: '🔢 Ticket ID',   value: ticketId,                          inline: true },
        { name: '📋 Type',        value: type,                              inline: true },
        { name: '⭐ Priority',    value: prio,                              inline: true },
        { name: '📝 Title',       value: title,                             inline: false },
        { name: '📅 Submitted',   value: `<t:${Math.floor(Date.now()/1000)}:F>`, inline: true }
      )
      .setFooter({ text: '💠 Your report helps improve Strata for everyone. We will respond within 24 hours.' })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel('💬 Join Support').setURL(process.env.SUPPORT_SERVER || 'https://discord.gg/strata')
    );

    await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
  }
};
