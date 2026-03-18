const mongoose = require('mongoose');

const shiftSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  guildId: { type: String, required: true },
  role: { type: String, default: 'Staff' },
  notes: { type: String },
  summary: { type: String },

  clockIn: { type: Date, required: true, default: Date.now },
  clockOut: { type: Date },
  durationMinutes: { type: Number, default: 0 },

  breaks: [{
    startTime: { type: Date },
    endTime: { type: Date },
    durationMinutes: { type: Number }
  }],
  totalBreakMinutes: { type: Number, default: 0 },
  activeBreak: { type: Boolean, default: false },
  breakStartTime: { type: Date },

  pointsEarned: { type: Number, default: 0 },
  status: { type: String, enum: ['active', 'on_break', 'completed'], default: 'active' },
  shiftNumber: { type: Number, default: 1 }
});

shiftSchema.methods.getActiveDurationMinutes = function() {
  const now = new Date();
  const end = this.clockOut || now;
  const rawMinutes = (end - this.clockIn) / 60000;
  return Math.round(rawMinutes - this.totalBreakMinutes);
};

shiftSchema.methods.formatDuration = function(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
};

module.exports = mongoose.model('Shift', shiftSchema);
