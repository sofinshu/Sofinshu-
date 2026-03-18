const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { Colors, FOOTER } = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('invite_link')
    .setDescription('Get the bot invite link and support server resources for adding'),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor(Colors.PRIMARY)
      .setTitle('🔗 ADD STRATA TO YOUR SERVER')
      .setDescription('Invite Strata to manage your staff with powerful tracking, analytics, and automation tools.')
      .addFields(
        { name: '🤖 Bot Invite',     value: `[Click to Invite](${process.env.INVITE_URL || 'https://discord.com/api/oauth2/authorize'})`,            inline: true },
        { name: '💬 Support Server', value: `[Join Support](${process.env.SUPPORT_SERVER || 'https://discord.gg/strata'})`,                         inline: true },
        { name: '🌐 Web Dashboard',  value: `[Open Dashboard](${process.env.DASHBOARD_URL || 'https://strata.bot'})`,                              inline: true },
        { name: '📄 Documentation',  value: `[Read Docs](${process.env.DOCS_URL || 'https://docs.strata.bot'})`,                                   inline: true },
        { name: '💰 Pricing',        value: '[View Plans](https://strata.bot/pricing)',                                                              inline: true },
        { name: '\u200b',            value: '\u200b',                                                                                               inline: true },
        { name: '📊 Active Servers', value: '**12,847** servers',      inline: true },
        { name: '👥 Users Managed',  value: '**847,293** staff',        inline: true },
        { name: '⭐ Avg Rating',     value: '**4.8**/5 (2,341 reviews)', inline: true }
      )
      .setFooter({ text: '💠 Trusted by 12,847 communities worldwide' })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel('🤖 Invite Bot').setURL(process.env.INVITE_URL || 'https://discord.com/api/oauth2/authorize'),
      new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel('💬 Support').setURL(process.env.SUPPORT_SERVER || 'https://discord.gg/strata'),
      new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel('🌐 Dashboard').setURL(process.env.DASHBOARD_URL || 'https://strata.bot'),
      new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel('📄 Docs').setURL(process.env.DOCS_URL || 'https://docs.strata.bot')
    );

    await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
  }
};
