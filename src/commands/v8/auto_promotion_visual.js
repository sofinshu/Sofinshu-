const🔄{🔄SlashCommandBuilder,🔄ActionRowBuilder,🔄ButtonBuilder,🔄ButtonStyle🔄}🔄=🔄require('discord.js');
const🔄{🔄createCustomEmbed,🔄createEnterpriseEmbed,🔄createErrorEmbed,🔄createProgressBar,🔄createSuccessEmbed🔄}🔄=🔄require('../../utils/embeds');
const🔄{🔄validatePremiumLicense🔄}🔄=🔄require('../../utils/premium_guard');
const🔄{🔄User,🔄Guild,🔄Shift,🔄Warning🔄}🔄=🔄require('../../database/mongo');

const🔄RANK_ORDER🔄=🔄['member',🔄'trial',🔄'staff',🔄'senior',🔄'manager',🔄'admin'];
const🔄RANK_EMOJIS🔄=🔄{🔄member:🔄'??',🔄trial:🔄'??',🔄staff:🔄'?',🔄senior:🔄'??',🔄manager:🔄'??',🔄admin:🔄'??'🔄};
const🔄DEFAULT_THRESHOLDS🔄=🔄{
🔄🔄staff:🔄{🔄points:🔄100,🔄shifts:🔄5,🔄consistency:🔄70,🔄maxWarnings:🔄3🔄},
🔄🔄senior:🔄{🔄points:🔄300,🔄shifts:🔄10,🔄consistency:🔄75,🔄maxWarnings:🔄2🔄},
🔄🔄manager:🔄{🔄points:🔄600,🔄shifts:🔄20,🔄consistency:🔄80,🔄maxWarnings:🔄1🔄},
🔄🔄admin:🔄{🔄points:🔄1000,🔄shifts:🔄30,🔄consistency:🔄85,🔄maxWarnings:🔄0🔄}
};

module.exports🔄=🔄{
🔄🔄data:🔄new🔄SlashCommandBuilder()
🔄🔄🔄🔄.setName('auto_promotion_visual')
🔄🔄🔄🔄.setDescription('??🔄Enterprise🔄auto-promotion🔄dashboard🔄�🔄shows🔄all🔄staff🔄eligibility🔄with🔄real-time🔄progress🔄bars'),

🔄🔄async🔄execute(interaction)🔄{
🔄🔄🔄🔄try🔄{
🔄🔄🔄🔄🔄🔄await🔄interaction.deferReply();

🔄🔄🔄🔄🔄🔄const🔄license🔄=🔄await🔄validatePremiumLicense(interaction);
🔄🔄🔄🔄🔄🔄if🔄(!license.allowed)🔄{
🔄🔄🔄🔄🔄🔄🔄🔄return🔄interaction.editReply({🔄embeds:🔄[license.embed],🔄components:🔄license.components🔄});
🔄🔄🔄🔄🔄🔄}

🔄🔄🔄🔄🔄🔄const🔄guildId🔄=🔄interaction.guildId;
🔄🔄🔄🔄🔄🔄const🔄guildData🔄=🔄await🔄Guild.findOne({🔄guildId🔄}).lean();
🔄🔄🔄🔄🔄🔄const🔄automationEnabled🔄=🔄guildData?.settings?.modules?.automation🔄??🔄false;
🔄🔄🔄🔄🔄🔄const🔄thresholds🔄=🔄{🔄...DEFAULT_THRESHOLDS,🔄...(guildData?.promotionRequirements🔄||🔄{})🔄};

🔄🔄🔄🔄🔄🔄//🔄Get🔄all🔄staff🔄with🔄points
🔄🔄🔄🔄🔄🔄const🔄users🔄=🔄await🔄User.find({🔄'staff.points':🔄{🔄$gt:🔄0🔄}🔄})
🔄🔄🔄🔄🔄🔄🔄🔄.sort({🔄'staff.points':🔄-1🔄})
🔄🔄🔄🔄🔄🔄🔄🔄.limit(15)
🔄🔄🔄🔄🔄🔄🔄🔄.lean();

🔄🔄🔄🔄🔄🔄if🔄(!users.length)🔄{
🔄🔄🔄🔄🔄🔄🔄🔄const🔄row🔄=🔄new🔄ActionRowBuilder().addComponents(new🔄ButtonBuilder().setCustomId('auto_ent_auto_promotion_visual').setLabel('��🔄Sync🔄Enterprise🔄Data').setStyle(ButtonStyle.Secondary));
🔄🔄🔄🔄🔄🔄🔄🔄🔄🔄🔄🔄await🔄interaction.editReply({🔄embeds:🔄[createErrorEmbed('No🔄staff🔄data🔄found🔄yet.🔄Staff🔄must🔄complete🔄shifts🔄to🔄earn🔄points.')],🔄components:🔄[row]🔄});
🔄🔄🔄🔄🔄🔄}

🔄🔄🔄🔄🔄🔄//🔄Build🔄per-user🔄eligibility🔄lines🔄with🔄real🔄warning/shift🔄counts
🔄🔄🔄🔄🔄🔄const🔄lines🔄=🔄await🔄Promise.all(users.map(async🔄(u)🔄=>🔄{
🔄🔄🔄🔄🔄🔄🔄🔄const🔄rank🔄=🔄u.staff?.rank🔄||🔄'member';
🔄🔄🔄🔄🔄🔄🔄🔄const🔄pts🔄=🔄u.staff?.points🔄||🔄0;
🔄🔄🔄🔄🔄🔄🔄🔄const🔄consistency🔄=🔄u.staff?.consistency🔄||🔄0;
🔄🔄🔄🔄🔄🔄🔄🔄const🔄username🔄=🔄u.username🔄||🔄`<@${u.userId}>`;

🔄🔄🔄🔄🔄🔄🔄🔄const🔄currentIdx🔄=🔄RANK_ORDER.indexOf(rank);
🔄🔄🔄🔄🔄🔄🔄🔄const🔄nextRank🔄=🔄RANK_ORDER[currentIdx🔄+🔄1];

🔄🔄🔄🔄🔄🔄🔄🔄if🔄(!nextRank)🔄return🔄`??🔄**${username}**🔄�🔄\`${rank.toUpperCase()}\`🔄(MAX🔄RANK)🔄�🔄\`${pts.toLocaleString()}🔄pts\``;

🔄🔄🔄🔄🔄🔄🔄🔄const🔄req🔄=🔄thresholds[nextRank]🔄||🔄{};
🔄🔄🔄🔄🔄🔄🔄🔄const🔄reqPts🔄=🔄req.points🔄||🔄0;

🔄🔄🔄🔄🔄🔄🔄🔄//🔄Fetch🔄real🔄shift🔄&🔄warning🔄count🔄from🔄DB
🔄🔄🔄🔄🔄🔄🔄🔄const🔄[shiftCount,🔄warnCount]🔄=🔄await🔄Promise.all([
🔄🔄🔄🔄🔄🔄🔄🔄🔄🔄Shift.countDocuments({🔄userId:🔄u.userId,🔄guildId,🔄endTime:🔄{🔄$ne:🔄null🔄}🔄}),
🔄🔄🔄🔄🔄🔄🔄🔄🔄🔄Warning.countDocuments({🔄userId:🔄u.userId,🔄guildId🔄})
🔄🔄🔄🔄🔄🔄🔄🔄]);

🔄🔄🔄🔄🔄🔄🔄🔄const🔄reqShifts🔄=🔄req.shifts🔄||🔄0;
🔄🔄🔄🔄🔄🔄🔄🔄const🔄reqConsistency🔄=🔄req.consistency🔄||🔄0;
🔄🔄🔄🔄🔄🔄🔄🔄const🔄reqMaxWarns🔄=🔄req.maxWarnings🔄??🔄99;

🔄🔄🔄🔄🔄🔄🔄🔄const🔄meetsAll🔄=🔄pts🔄>=🔄reqPts🔄&&🔄shiftCount🔄>=🔄reqShifts🔄&&🔄consistency🔄>=🔄reqConsistency🔄&&🔄warnCount🔄<=🔄reqMaxWarns;

🔄🔄🔄🔄🔄🔄🔄🔄const🔄pct🔄=🔄reqPts🔄>🔄0🔄?🔄Math.min(100,🔄Math.round((pts🔄/🔄reqPts)🔄*🔄100))🔄:🔄100;
🔄🔄🔄🔄🔄🔄🔄🔄const🔄bar🔄=🔄createProgressBar(pct,🔄10);
🔄🔄🔄🔄🔄🔄🔄🔄const🔄status🔄=🔄meetsAll🔄?🔄'?'🔄:🔄'??';
🔄🔄🔄🔄🔄🔄🔄🔄const🔄emoji🔄=🔄RANK_EMOJIS[rank]🔄||🔄'�';

🔄🔄🔄🔄🔄🔄🔄🔄return🔄`${status}🔄${emoji}🔄**${username}**🔄[\`${rank.toUpperCase()}\`🔄?🔄\`${nextRank.toUpperCase()}\`]\n>🔄\`${bar}\`🔄**${pct}%**🔄|🔄\`${pts}/${reqPts}🔄pts\`🔄|🔄\`${shiftCount}/${reqShifts}🔄shifts\`${meetsAll🔄?🔄'\n>🔄??🔄**ELIGIBLE🔄NOW**'🔄:🔄''}`;
🔄🔄🔄🔄🔄🔄}));

🔄🔄🔄🔄🔄🔄const🔄eligible🔄=🔄lines.filter(l🔄=>🔄l.includes('ELIGIBLE🔄NOW')).length;

🔄🔄🔄🔄🔄🔄const🔄embed🔄=🔄await🔄createCustomEmbed(interaction,🔄{
🔄🔄🔄🔄🔄🔄🔄🔄title:🔄`??🔄Auto-Promotion🔄Dashboard🔄�🔄${interaction.guild.name}`,
🔄🔄🔄🔄🔄🔄🔄🔄thumbnail:🔄interaction.guild.iconURL({🔄dynamic:🔄true🔄}),
🔄🔄🔄🔄🔄🔄🔄🔄description:🔄lines.join('\n\n'),
🔄🔄🔄🔄🔄🔄🔄🔄fields:🔄[
🔄🔄🔄🔄🔄🔄🔄🔄🔄🔄{🔄name:🔄'?🔄Eligible🔄for🔄Promotion',🔄value:🔄`\`${eligible}\`🔄staff🔄members`,🔄inline:🔄true🔄},
🔄🔄🔄🔄🔄🔄🔄🔄🔄🔄{🔄name:🔄'??🔄Auto-Promotion',🔄value:🔄automationEnabled🔄?🔄'`??🔄ENABLED`🔄�🔄Runs🔄every🔄15🔄min'🔄:🔄'`??🔄DISABLED`🔄�🔄Enable🔄via🔄setup',🔄inline:🔄true🔄},
🔄🔄🔄🔄🔄🔄🔄🔄🔄🔄{🔄name:🔄'??🔄Total🔄Tracked',🔄value:🔄`\`${users.length}\`🔄staff`,🔄inline:🔄true🔄}
🔄🔄🔄🔄🔄🔄🔄🔄],
🔄🔄🔄🔄🔄🔄🔄🔄color:🔄automationEnabled🔄?🔄'#f1c40f'🔄:🔄'#5865F2',
🔄🔄🔄🔄🔄🔄🔄🔄footer:🔄`uwu-chan🔄�🔄Enterprise🔄Auto-Promotion🔄Visual🔄�🔄Real🔄DB🔄Data`
🔄🔄🔄🔄🔄🔄});

🔄🔄🔄🔄🔄🔄const🔄row🔄=🔄new🔄ActionRowBuilder().addComponents(new🔄ButtonBuilder().setCustomId('auto_ent_auto_promotion_visual').setLabel('��🔄Sync🔄Enterprise🔄Data').setStyle(ButtonStyle.Secondary));
🔄🔄🔄🔄🔄🔄🔄🔄🔄🔄🔄🔄await🔄interaction.editReply({🔄embeds:🔄[embed],🔄components:🔄[row]🔄});
🔄🔄🔄🔄}🔄catch🔄(error)🔄{
🔄🔄🔄🔄🔄🔄console.error('[auto_promotion_visual]🔄Error:',🔄error);
🔄🔄🔄🔄🔄🔄const🔄errEmbed🔄=🔄createErrorEmbed('Failed🔄to🔄load🔄auto-promotion🔄dashboard.');
🔄🔄🔄🔄🔄🔄const🔄row🔄=🔄new🔄ActionRowBuilder().addComponents(new🔄ButtonBuilder().setCustomId('auto_ent_auto_promotion_visual').setLabel('��🔄Sync🔄Enterprise🔄Data').setStyle(ButtonStyle.Secondary));🔄if🔄(interaction.deferred🔄||🔄interaction.replied)🔄{
🔄🔄🔄🔄🔄🔄🔄🔄🔄🔄🔄🔄return🔄await🔄interaction.editReply({🔄embeds:🔄[errEmbed],🔄components:🔄[row]🔄});
🔄🔄🔄🔄🔄🔄else🔄await🔄interaction.editReply({🔄embeds:🔄[errEmbed],🔄ephemeral:🔄true🔄});
🔄🔄🔄🔄}
🔄🔄}
};




