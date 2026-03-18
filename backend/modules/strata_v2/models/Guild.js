const mongoose = require('mongoose');

const guildSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  name: { type: String },
  tier: { type: String, enum: ['free', 'premium', 'enterprise'], default: 'free' },
  premiumExpiresAt: { type: Date },
  
  // Rank configuration
  ranks: [{
    name: { type: String },
    roleId: { type: String },
    color: { type: String, default: '#5865F2' },
    position: { type: Number },
    requiredPoints: { type: Number, default: 0 },
    requiredShifts: { type: Number, default: 0 },
    requiredDays: { type: Number, default: 0 },
    maxWarnings: { type: Number, default: 3 },
    permissions: [{ type: String }]
  }],

  // Channel configuration
  channels: {
    logs: { type: String },
    promotions: { type: String },
    moderation: { type: String },
    tickets: { type: String },
    shifts: { type: String },
    general: { type: String }
  },

  // Role configuration
  roles: {
    managers: [{ type: String }],
    staff: [{ type: String }]
  },

  // Settings
  settings: {
    timezone: { type: String, default: 'UTC' },
    language: { type: String, default: 'en' },
    shiftGoalHours: { type: Number, default: 40 },
    warningThreshold: { type: Number, default: 3 },
    warningExpiryDays: { type: Number, default: 90 },
    pointsPerHour: { type: Number, default: 10 },
    promotionBonusPoints: { type: Number, default: 100 },
    demotionPointDeduction: { type: Number, default: 50 },
    notifyOnPromotion: { type: Boolean, default: true },
    notifyOnWarning: { type: Boolean, default: true },
    autoRoleUpdate: { type: Boolean, default: true }
  },

  // Ticket system
  ticketSystem: {
    enabled: { type: Boolean, default: false },
    panelChannelId: { type: String },
    panelMessageId: { type: String },
    categoryId: { type: String },
    supportRoles: [{ type: String }],
    ticketCounter: { type: Number, default: 0 }
  },

  // Application system
  applicationSystem: {
    enabled: { type: Boolean, default: false },
    panelChannelId: { type: String },
    reviewChannelId: { type: String },
    questions: [{ type: String }]
  },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

guildSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Guild', guildSchema);
