const mongoose = require('mongoose');

const staffSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  guildId: { type: String, required: true },
  username: { type: String },
  displayName: { type: String },
  avatarURL: { type: String },

  // Rank
  rank: { type: String, default: 'Trial Moderator' },
  rankHistory: [{
    rank: { type: String },
    action: { type: String, enum: ['promoted', 'demoted', 'hired', 'fired'] },
    reason: { type: String },
    issuedBy: { type: String },
    timestamp: { type: Date, default: Date.now }
  }],

  // Points
  points: { type: Number, default: 0 },
  weeklyPoints: { type: Number, default: 0 },
  weeklyPointsResetAt: { type: Date, default: Date.now },

  // Shift Summary (aggregated)
  totalShiftMinutes: { type: Number, default: 0 },
  weeklyShiftMinutes: { type: Number, default: 0 },
  weeklyShiftsResetAt: { type: Date, default: Date.now },
  totalShiftsCompleted: { type: Number, default: 0 },
  currentShiftId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shift', default: null },

  // Streak
  shiftStreak: { type: Number, default: 0 },
  lastShiftDate: { type: Date },
  longestStreak: { type: Number, default: 0 },

  // Performance
  performanceScore: { type: Number, default: 50 },
  warningCount: { type: Number, default: 0 },
  activeWarningCount: { type: Number, default: 0 },

  // Achievements
  achievements: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Achievement' }],

  // Status
  isActive: { type: Boolean, default: true },
  isOnShift: { type: Boolean, default: false },

  joinedStaffAt: { type: Date, default: Date.now },
  lastActiveAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
});

staffSchema.index({ userId: 1, guildId: 1 }, { unique: true });

// Calculate performance score
staffSchema.methods.calculatePerformance = function() {
  let score = 50;
  const weeklyHours = this.weeklyShiftMinutes / 60;
  if (weeklyHours >= 40) score += 20;
  else if (weeklyHours >= 30) score += 15;
  else if (weeklyHours >= 20) score += 10;
  else if (weeklyHours >= 10) score += 5;
  score += Math.min(this.shiftStreak * 2, 20);
  score -= this.activeWarningCount * 10;
  return Math.max(0, Math.min(100, score));
};

module.exports = mongoose.model('Staff', staffSchema);
