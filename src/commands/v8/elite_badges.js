const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createEnterpriseEmbed, createSuccessEmbed, createErrorEmbed } = require('../../utils/embeds');
const { createCustomEmbed, createErrorEmbed, createSuccessEmbed } = require('../../utils/embeds');
const { validatePremiumLicense } = require('../../utils/premium_guard');
const { User } = require('../../database/mongo');

const ELITE_BADGES = [
  { id: 'shift_master', label: '? Shift Master', desc: 'Completed 50+ shifts' },
  { id: 'point_legend', label: '? Point Legend', desc: 'Earned 1000+ points' },
  { id: 'consistent', label: '?? Consistent', desc: 'Maintained 90%+ consistency for 30 days' },
  { id: 'team_player', label: '?? Team Player', desc: 'Received 10+ commendations' },
  { id: 'mentor', label: '?? Mentor', desc: 'Helped onboard new staff members' },
  { id: 'guardian', label: '??? Guardian', desc: 'Zero warnings for 30+ days' },
  { id: 'veteran', label: '??? Veteran', desc: 'Active for 6+ months' },
  { id: 'elite', label: '?? Elite', desc: 'Reached the top 1% in server activity' }
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('elite_badges')
    .setDescription('?? Grant or view elite badges for exceptional staff members')
    .addSubcommand(sub =>
      sub.setName('grant')
        .setDescription('?? Grant an elite badge to a staff member')
        .addUserOption(opt => opt.setName('user').setDescription('Staff member to award').setRequired(true))
        .addStringOption(opt =>
          opt.setName('badge')
            .setDescription('Badge to grant')
            .setRequired(true)
            .addChoices(...ELITE_BADGES.map(b => ({ name: b.label, value: b.id })))
        )
    )
    .addSubcommand(sub =>
      sub.setName('view')
        .setDescription('??? View all badges for a staff member')
        .addUserOption(opt => opt.setName('user').setDescription('Staff member to view').setRequired(false))
    )
    .addSubcommand(sub =>
      sub.setName('list')
        .setDescription('?? List all available elite badges')
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    try {
      await interaction.deferReply();

      const license = await validatePremiumLicense(interaction);
      if (!license.allowed) {
        return interaction.editReply({ embeds: [license.embed], components: license.components });
      }

      const sub = interaction.options.getSubcommand();

      if (sub === 'list') {
        const badgeList = ELITE_BADGES.map(b => `**${b.label}** — *${b.desc}*`).join('\n');
        const embed = await createCustomEmbed(interaction, {
          title: '?? Elite Badge Catalogue',
          description: `All available badges that can be granted to exceptional staff members.\n\n${badgeList}`,
          fields: [{ name: '?? Total Badges', value: `\`${ELITE_BADGES.length}\` available`, inline: true }],
          color: 'enterprise',
          footer: 'uwu-chan • Elite Badges System'
        });
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_ent_elite_badges').setLabel('ðŸ„ðŸ„ Sync Enterprise Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [embed], components: [row] });
      }

      if (sub === 'view') {
        const target = interaction.options.getUser('user') || interaction.user;
        const user = await User.findOne({ userId: target.id, 'guilds.guildId': interaction.guildId }).lean();
        const badges = user?.staff?.achievements || [];

        const badgeDisplay = badges.length > 0
          ? badges.map(badgeId => {
            const badge = ELITE_BADGES.find(b => b.id === badgeId);
            return badge ? `${badge.label} — *${badge.desc}*` : `?? ${badgeId}`;
          }).join('\n')
          : '`No badges awarded yet`';

        const embed = await createCustomEmbed(interaction, {
          title: `?? Elite Badges: ${target.username}`,
          thumbnail: target.displayAvatarURL({ dynamic: true }),
          description: `All elite badges earned by **${target.username}**.`,
          fields: [
            { name: '?? Earned Badges', value: badgeDisplay, inline: false },
            { name: '?? Badge Count', value: `\`${badges.length}\` / \`${ELITE_BADGES.length}\``, inline: true }
          ],
          color: 'enterprise',
          footer: 'uwu-chan • Elite Badges System'
        });
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_ent_elite_badges').setLabel('ðŸ„ðŸ„ Sync Enterprise Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [embed], components: [row] });
      }

      if (sub === 'grant') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
          const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_ent_elite_badges').setLabel('ðŸ„ðŸ„ Sync Enterprise Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [createErrorEmbed('You need the `Manage Server` permission to grant badges.')], components: [row] });
        }

        const target = interaction.options.getUser('user');
        const badgeId = interaction.options.getString('badge');
        const badge = ELITE_BADGES.find(b => b.id === badgeId);

        if (!badge) const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_ent_elite_badges').setLabel('ðŸ„ðŸ„ Sync Enterprise Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [createErrorEmbed('Invalid badge selection.')], components: [row] });

        // Update user in DB — add to achievements array (no duplicates)
        await User.findOneAndUpdate(
          { userId: target.id },
          { $addToSet: { 'staff.achievements': badgeId } },
          { upsert: true }
        );

        const embed = await createCustomEmbed(interaction, {
          title: '?? Elite Badge Granted!',
          thumbnail: target.displayAvatarURL({ dynamic: true }),
          description: `**${badge.label}** has been awarded to **${target.username}**!`,
          fields: [
            { name: '?? Badge', value: badge.label, inline: true },
            { name: '?? Description', value: badge.desc, inline: true },
            { name: '?? Awarded To', value: `<@${target.id}>`, inline: true },
            { name: '??? Granted By', value: `**${interaction.user.username}**`, inline: true }
          ],
          color: 'enterprise',
          footer: 'uwu-chan • Elite Badges System'
        });

        // Try to DM the awardee
        try {
          const dmEmbed = createSuccessEmbed(
            `?? You earned ${badge.label}!`,
            `You have been awarded the **${badge.label}** badge in **${interaction.guild.name}**!\n*${badge.desc}*`
          );
          await target.send({ embeds: [dmEmbed] });
        } catch { }

        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_ent_elite_badges').setLabel('ðŸ„ðŸ„ Sync Enterprise Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [embed], components: [row] });
      }
    } catch (error) {
      console.error('[elite_badges] Error:', error);
      const errEmbed = createErrorEmbed('Failed to process elite badge operation.');
      if (interaction.deferred || interaction.replied) const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_ent_elite_badges').setLabel('ðŸ„ðŸ„ Sync Enterprise Data').setStyle(ButtonStyle.Secondary));
            await interaction.editReply({ embeds: [errEmbed], components: [row] });
      else await interaction.reply({ embeds: [errEmbed], ephemeral: true });
    }
  }
};




