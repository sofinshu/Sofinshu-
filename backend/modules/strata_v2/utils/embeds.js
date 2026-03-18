const { EmbedBuilder } = require('discord.js');

const Colors = {
  PRIMARY:   0x5865F2,
  SUCCESS:   0x57F287,
  ERROR:     0xED4245,
  WARNING:   0xFEE75C,
  INFO:      0x5865F2,
  GOLD:      0xFFD700,
  PINK:      0xF47FFF,
  ORANGE:    0xE67E22,
  DARK_RED:  0x992D22,
  PURPLE:    0x9B59B6
};

const FOOTER = '💠 Strata v2.0 • Powered by sofinshu';

function base(color = Colors.PRIMARY) {
  return new EmbedBuilder()
    .setColor(color)
    .setTimestamp()
    .setFooter({ text: FOOTER });
}

function success(title, description = '') {
  return base(Colors.SUCCESS).setTitle(`✅ ${title}`).setDescription(description || null);
}

function error(title, description = '') {
  return base(Colors.ERROR).setTitle(`❌ ${title}`).setDescription(description || null);
}

function warning(title, description = '') {
  return base(Colors.WARNING).setTitle(`⚠️ ${title}`).setDescription(description || null);
}

function info(title, description = '') {
  return base(Colors.PRIMARY).setTitle(`ℹ️ ${title}`).setDescription(description || null);
}

function premiumUpsell(requiredTier = 'Premium') {
  const tierEmoji = requiredTier === 'Enterprise' ? '🟣' : '🔵';
  const price = requiredTier === 'Enterprise' ? '$24.99/month' : '$9.99/month';
  return base(Colors.PINK)
    .setTitle('🔒 PREMIUM FEATURE')
    .setDescription(`This command requires ${tierEmoji} **${requiredTier}** plan`)
    .addFields({
      name: '✨ What you\'ll unlock:',
      value: requiredTier === 'Enterprise'
        ? '• AI-powered features\n• Cross-server management\n• Data exports (PDF/CSV/JSON)\n• Predictive analytics\n• And 109 total enterprise commands'
        : '• Full analytics dashboard\n• Automated workflows\n• Advanced moderation tools\n• Achievements & rewards\n• And 110 more commands'
    }, {
      name: '💰 Pricing',
      value: `${price} • [Upgrade Now](https://your-site.com/premium)`
    });
}

function progressBar(current, max, length = 10) {
  const filled = Math.round((current / max) * length);
  const empty  = length - filled;
  return '▓'.repeat(Math.max(0, filled)) + '░'.repeat(Math.max(0, empty));
}

function healthBar(percent) {
  const bar = progressBar(percent, 100);
  let color = Colors.SUCCESS;
  if (percent < 50) color = Colors.ERROR;
  else if (percent < 70) color = Colors.WARNING;
  return { bar, color };
}

function streakEmoji(streak) {
  if (streak >= 30) return '👑🔥🔥🔥🔥';
  if (streak >= 14) return '🔥🔥🔥🔥';
  if (streak >= 7)  return '🔥🔥🔥';
  if (streak >= 3)  return '🔥🔥';
  return '🔥';
}

function formatMinutes(totalMinutes) {
  const h = Math.floor(totalMinutes / 60);
  const m = Math.round(totalMinutes % 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

function latencyColor(ms) {
  if (ms < 100) return Colors.SUCCESS;
  if (ms < 200) return Colors.WARNING;
  return Colors.ERROR;
}

function performanceColor(score) {
  if (score >= 90) return '🟢 Excellent';
  if (score >= 80) return '🟢 Great';
  if (score >= 70) return '🟡 Good';
  if (score >= 60) return '🟡 Fair';
  if (score >= 50) return '🟠 Needs Improvement';
  if (score >= 40) return '🔴 Poor';
  return '🔴 Critical';
}

function severityColor(severity) {
  return { minor: Colors.WARNING, moderate: Colors.ORANGE, major: Colors.ERROR, critical: Colors.DARK_RED }[severity] || Colors.WARNING;
}

module.exports = { Colors, base, success, error, warning, info, premiumUpsell, progressBar, healthBar, streakEmoji, formatMinutes, latencyColor, performanceColor, severityColor, FOOTER };
