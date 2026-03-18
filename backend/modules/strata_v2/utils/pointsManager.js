const Staff      = require('../models/Staff');
const Transaction = require('../models/Transaction');

const POINTS = {
  PER_HOUR: 10,
  SHIFT_COMPLETION: 10,
  ON_TIME_BONUS: 5,
  NO_BREAK_PENALTY: -5,
  OVERTIME_PER_HOUR: 5,
  PROMOTION_BONUS: 100,
  DEMOTION_DEDUCTION: 50,
  WARNING_MINOR: -10,
  WARNING_MODERATE: -25,
  WARNING_MAJOR: -50,
  WARNING_CRITICAL: -100
};

async function getStaff(userId, guildId) {
  return Staff.findOne({ userId, guildId });
}

async function getOrCreateStaff(userId, guildId, username) {
  let staff = await Staff.findOne({ userId, guildId });
  if (!staff) staff = await Staff.create({ userId, guildId, username });
  return staff;
}

async function addPoints(userId, guildId, amount, type, reason, issuedBy = 'system') {
  const staff = await Staff.findOne({ userId, guildId });
  if (!staff) return null;

  staff.points = Math.max(0, staff.points + amount);
  staff.weeklyPoints = Math.max(0, staff.weeklyPoints + amount);
  staff.lastActiveAt = new Date();
  await staff.save();

  await Transaction.create({
    userId, guildId, amount, type, reason,
    issuedBy, balanceAfter: staff.points
  });

  return staff;
}

async function removePoints(userId, guildId, amount, type, reason, issuedBy = 'system') {
  return addPoints(userId, guildId, -Math.abs(amount), type, reason, issuedBy);
}

async function getPointsRank(userId, guildId) {
  const all = await Staff.find({ guildId, isActive: true }).sort({ points: -1 });
  const idx = all.findIndex(s => s.userId === userId);
  return { rank: idx === -1 ? null : idx + 1, total: all.length };
}

async function getTopPoints(guildId, limit = 10) {
  return Staff.find({ guildId, isActive: true }).sort({ points: -1 }).limit(limit);
}

async function getRecentTransactions(userId, guildId, limit = 5) {
  return Transaction.find({ userId, guildId }).sort({ timestamp: -1 }).limit(limit);
}

async function calcShiftPoints(durationMinutes, hadBreak = true) {
  const hours = durationMinutes / 60;
  let pts = Math.round(hours * POINTS.PER_HOUR);
  pts += POINTS.SHIFT_COMPLETION;
  if (!hadBreak && hours > 3) pts += POINTS.NO_BREAK_PENALTY;
  if (hours > 8) pts += Math.floor((hours - 8) * POINTS.OVERTIME_PER_HOUR);
  return Math.max(0, pts);
}

module.exports = { POINTS, getStaff, getOrCreateStaff, addPoints, removePoints, getPointsRank, getTopPoints, getRecentTransactions, calcShiftPoints };
