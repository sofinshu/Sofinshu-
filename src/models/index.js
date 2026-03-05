const mongoose = require('mongoose');

const moderationLogSchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  moderatorId: { type: String, required: true },
  action: {
    type: String,
    enum: ['warn', 'mute', 'unmute', 'kick', 'ban', 'unban', 'timeout', 'untimeout', 'softban', 'prune', 'note'],
    required: true
  },
  reason: { type: String, default: 'No reason provided' },
  severity: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  duration: { type: Number, default: null },
  points: { type: Number, default: 0 },
  evidence: [{
    type: { type: String, enum: ['image', 'message', 'link'], default: 'message' },
    content: String,
    timestamp: { type: Date, default: Date.now }
  }],
  expiresAt: { type: Date, default: null },
  active: { type: Boolean, default: true },
  relatedCaseIds: [{ type: String }],
  metadata: mongoose.Schema.Types.Mixed,
  createdAt: { type: Date, default: Date.now }
});

moderationLogSchema.index({ guildId: 1, userId: 1, createdAt: -1 });
moderationLogSchema.index({ guildId: 1, action: 1, createdAt: -1 });

const promotionSchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  fromRank: { type: String, required: true },
  toRank: { type: String, required: true },
  promotedBy: { type: String, default: 'system' },
  promotionType: { type: String, enum: ['manual', 'automatic', 'review'], default: 'manual' },
  criteria: {
    points: { type: Number, default: 0 },
    shifts: { type: Number, default: 0 },
    consistency: { type: Number, default: 0 },
    warnings: { type: Number, default: 0 },
    daysInServer: { type: Number, default: 0 }
  },
  approved: { type: Boolean, default: true },
  approvedBy: { type: String, default: null },
  approvedAt: { type: Date, default: null },
  deniedReason: { type: String, default: null },
  announced: { type: Boolean, default: false },
  announcementChannelId: { type: String, default: null },
  createdAt: { type: Date, default: Date.now }
});

promotionSchema.index({ guildId: 1, userId: 1, createdAt: -1 });

const serverConfigSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  modules: {
    staffManagement: { type: Boolean, default: true },
    moderation: { type: Boolean, default: true },
    analytics: { type: Boolean, default: true },
    tickets: { type: Boolean, default: false },
    applications: { type: Boolean, default: false },
    autoPromotion: { type: Boolean, default: false },
    leveling: { type: Boolean, default: false },
    economy: { type: Boolean, default: false }
  },
  channels: {
    logs: { type: String, default: null },
    modLogs: { type: String, default: null },
    welcome: { type: String, default: null },
    goodbye: { type: String, default: null },
    promotions: { type: String, default: null },
    reports: { type: String, default: null },
    tickets: { type: String, default: null },
    applications: { type: String, default: null },
    autoChat: { type: String, default: null }
  },
  roles: {
    admin: { type: String, default: null },
    moderator: { type: String, default: null },
    helper: { type: String, default: null },
    staff: { type: String, default: null },
    muted: { type: String, default: null },
    onDuty: { type: String, default: null }
  },
  autoMod: {
    enabled: { type: Boolean, default: false },
    filters: {
      spam: { enabled: { type: Boolean, default: false }, threshold: { type: Number, default: 5 }, window: { type: Number, default: 5000 } },
      invites: { enabled: { type: Boolean, default: false }, action: { type: String, default: 'delete' } },
      links: { enabled: { type: Boolean, default: false }, whitelist: [String] },
      caps: { enabled: { type: Boolean, default: false }, threshold: { type: Number, default: 70 } },
      mentions: { enabled: { type: Boolean, default: false }, threshold: { type: Number, default: 5 } }
    },
    actions: {
      spam: { type: String, default: 'warn' },
      invites: { type: String, default: 'delete' },
      links: { type: String, default: 'delete' },
      caps: { type: String, default: 'warn' },
      mentions: { type: String, default: 'mute' }
    }
  },
  leveling: {
    enabled: { type: Boolean, default: false },
    xpPerMessage: { type: Number, default: 5 },
    xpPerCommand: { type: Number, default: 10 },
    cooldown: { type: Number, default: 60000 },
    multiplier: { type: Number, default: 1.0 },
    roles: [{
      level: { type: Number, required: true },
      roleId: { type: String, required: true },
      removePrevious: { type: Boolean, default: false }
    }],
    ignoredChannels: [String],
    ignoredRoles: [String]
  },
  economy: {
    enabled: { type: Boolean, default: false },
    currencyName: { type: String, default: 'coins' },
    currencySymbol: { type: String, default: '🪙' },
    dailyAmount: { type: Number, default: 100 },
    workCooldown: { type: Number, default: 3600000 },
    workMin: { type: Number, default: 10 },
    workMax: { type: Number, default: 100 }
  },
  welcome: {
    enabled: { type: Boolean, default: false },
    channelId: { type: String, default: null },
    message: { type: String, default: 'Welcome {user} to {server}!' },
    dmMessage: { type: String, default: '' },
    imageURL: { type: String, default: null },
    roleIds: [String]
  },
  goodbye: {
    enabled: { type: Boolean, default: false },
    channelId: { type: String, default: null },
    message: { type: String, default: 'Goodbye {user}. We will miss you!' }
  },
  autoRoles: [{
    roleId: { type: String, required: true },
    delay: { type: Number, default: 0 },
    requirements: mongoose.Schema.Types.Mixed
  }],
  customCommands: [{
    name: { type: String, required: true },
    response: { type: String, required: true },
    type: { type: String, enum: ['exact', 'startswith', 'contains'], default: 'exact' },
    channels: [String],
    roles: [String],
    cooldown: { type: Number, default: 0 },
    enabled: { type: Boolean, default: true }
  }],
  updateAt: { type: Date, default: Date.now }
});

const userStatsSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  guildId: { type: String, required: true, index: true },
  messages: {
    total: { type: Number, default: 0 },
    daily: { type: Number, default: 0 },
    weekly: { type: Number, default: 0 },
    monthly: { type: Number, default: 0 }
  },
  voice: {
    totalMinutes: { type: Number, default: 0 },
    dailyMinutes: { type: Number, default: 0 },
    weeklyMinutes: { type: Number, default: 0 },
    monthlyMinutes: { type: Number, default: 0 },
    sessions: { type: Number, default: 0 }
  },
  xp: {
    current: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    lastMessage: { type: Date, default: null }
  },
  economy: {
    wallet: { type: Number, default: 0 },
    bank: { type: Number, default: 0 },
    totalEarned: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
    lastDaily: { type: Date, default: null },
    lastWork: { type: Date, default: null },
    streak: { type: Number, default: 0 }
  },
  staff: {
    rank: { type: String, default: 'trial' },
    points: { type: Number, default: 0 },
    warnings: { type: Number, default: 0 },
    shifts: { type: Number, default: 0 },
    shiftMinutes: { type: Number, default: 0 },
    lastShift: { type: Date, default: null },
    consistency: { type: Number, default: 100 },
    reputation: { type: Number, default: 0 },
    achievements: [{ type: String }],
    joinedStaffAt: { type: Date, default: null },
    lastPromotionAt: { type: Date, default: null },
    strikes: { type: Number, default: 0 }
  },
  moderation: {
    warnings: { type: Number, default: 0 },
    mutes: { type: Number, default: 0 },
    kicks: { type: Number, default: 0 },
    bans: { type: Number, default: 0 },
    lastPunishment: { type: Date, default: null }
  },
  lastActive: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

userStatsSchema.index({ userId: 1, guildId: 1 }, { unique: true });
userStatsSchema.index({ guildId: 1, 'xp.level': -1 });
userStatsSchema.index({ guildId: 1, 'staff.points': -1 });

const autoPromotionRuleSchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  enabled: { type: Boolean, default: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  fromRank: { type: String, required: true },
  toRank: { type: String, required: true },
  requirements: {
    minPoints: { type: Number, default: 0 },
    minShifts: { type: Number, default: 0 },
    minShiftHours: { type: Number, default: 0 },
    minConsistency: { type: Number, default: 0 },
    maxWarnings: { type: Number, default: 3 },
    minDaysInRank: { type: Number, default: 7 },
    minReputation: { type: Number, default: 0 },
    achievements: [{ type: String }]
  },
  actions: {
    requireApproval: { type: Boolean, default: true },
    announcePromotion: { type: Boolean, default: true },
    dmUser: { type: Boolean, default: true },
    grantRole: { type: Boolean, default: true },
    removeOldRole: { type: Boolean, default: true }
  },
  schedule: {
    checkInterval: { type: Number, default: 3600000 },
    onlyDuringActiveHours: { type: Boolean, default: false },
    activeHoursStart: { type: Number, default: 0 },
    activeHoursEnd: { type: Number, default: 24 }
  },
  priority: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

autoPromotionRuleSchema.index({ guildId: 1, fromRank: 1, priority: -1 });

const announcementSchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  type: { type: String, enum: ['promotion', 'milestone', 'announcement', 'alert'], required: true },
  title: { type: String, required: true },
  content: { type: String, required: true },
  channelId: { type: String, required: true },
  authorId: { type: String, required: true },
  targetRoleIds: [{ type: String }],
  targetUserIds: [{ type: String }],
  scheduledFor: { type: Date, default: null },
  sentAt: { type: Date, default: null },
  messageId: { type: String, default: null },
  pinned: { type: Boolean, default: false },
  reactions: [{ type: String }],
  createdAt: { type: Date, default: Date.now }
});

announcementSchema.index({ guildId: 1, scheduledFor: 1 });

const ModerationLog = mongoose.model('ModerationLog', moderationLogSchema);
const Promotion = mongoose.model('Promotion', promotionSchema);
const ServerConfig = mongoose.model('ServerConfig', serverConfigSchema);
const UserStats = mongoose.model('UserStats', userStatsSchema);
const AutoPromotionRule = mongoose.model('AutoPromotionRule', autoPromotionRuleSchema);
const Announcement = mongoose.model('Announcement', announcementSchema);

module.exports = {
  ModerationLog,
  Promotion,
  ServerConfig,
  UserStats,
  AutoPromotionRule,
  Announcement
};
