const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { Colors, FOOTER } = require('./embeds');

class Paginator {
  constructor({ items, pageSize = 10, title, color = Colors.PRIMARY, formatItem, footer, ephemeral = false }) {
    this.items    = items;
    this.pageSize = pageSize;
    this.title    = title;
    this.color    = color;
    this.formatItem = formatItem;
    this.footerText = footer;
    this.ephemeral  = ephemeral;
    this.page = 0;
    this.totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  }

  getPageItems() {
    const start = this.page * this.pageSize;
    return this.items.slice(start, start + this.pageSize);
  }

  buildEmbed() {
    const items = this.getPageItems();
    const description = items.length
      ? items.map((item, i) => this.formatItem(item, this.page * this.pageSize + i)).join('\n')
      : '*No items found.*';

    return new EmbedBuilder()
      .setColor(this.color)
      .setTitle(this.title)
      .setDescription(description)
      .setFooter({ text: this.footerText || `Page ${this.page + 1}/${this.totalPages} • ${this.items.length} total items • ${FOOTER}` })
      .setTimestamp();
  }

  buildRow(customId = 'page') {
    return new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`${customId}_prev`)
        .setLabel('◀️ Prev')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(this.page === 0),
      new ButtonBuilder()
        .setCustomId(`${customId}_page`)
        .setLabel(`Page ${this.page + 1}/${this.totalPages}`)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId(`${customId}_next`)
        .setLabel('Next ▶️')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(this.page >= this.totalPages - 1)
    );
  }

  prev() { if (this.page > 0) this.page--; }
  next() { if (this.page < this.totalPages - 1) this.page++; }

  async send(interaction) {
    const reply = await interaction.reply({
      embeds: [this.buildEmbed()],
      components: this.totalPages > 1 ? [this.buildRow()] : [],
      ephemeral: this.ephemeral
    });

    if (this.totalPages <= 1) return;

    const collector = reply.createMessageComponentCollector({ time: 180_000 });
    collector.on('collect', async i => {
      if (i.user.id !== interaction.user.id) {
        return i.reply({ content: '❌ This menu is not for you.', ephemeral: true });
      }
      if (i.customId.endsWith('_prev')) this.prev();
      else if (i.customId.endsWith('_next')) this.next();
      await i.update({ embeds: [this.buildEmbed()], components: [this.buildRow()] });
    });
    collector.on('end', () => {
      reply.edit({ components: [] }).catch(() => {});
    });
  }
}

module.exports = Paginator;
