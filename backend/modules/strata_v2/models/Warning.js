const mongoose = require('mongoose');

const warningSchema = new mongoose.Schema({
  warningId: { type: String, unique: true },
  userId: { type: String, required: true },
  guildId: { type: String, required: true },
  reason: { type: String, required: true },
  severity: { type: String, enum: ['minor', 'moderate', 'major', 'critical'], default: 'moderate' },
  issuedBy: { type: String, required: true },
  issuedByName: { type: String },
  pointsDeducted: { type: Number, default: 25 },
  active: { type: Boolean, default: true },
  expiresAt: { type: Date },
  clearedBy: { type: String },
  clearedAt: { type: Date },
  clearReason: { type: String },
  issuedAt: { type: Date, default: Date.now }
});

// Auto-generate warning ID
warningSchema.pre('save', function(next) {
  if (!this.warningId) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let id = '#WRN-';
    for (let i = 0; i < 5; i++) id += chars[Math.floor(Math.random() * chars.length)];
    this.warningId = id;
  }
  // Set expiry based on severity
  if (!this.expiresAt) {
    const days = { minor: 30, moderate: 60, major: 90, critical: 180 };
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + days[this.severity]);
    this.expiresAt = expiry;
  }
  // Points deduction
  const pts = { minor: 10, moderate: 25, major: 50, critical: 100 };
  this.pointsDeducted = pts[this.severity];
  next();
});

module.exports = mongoose.model('Warning', warningSchema);
