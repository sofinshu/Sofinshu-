const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  guildId: { type: String, required: true },
  amount: { type: Number, required: true },
  type: { 
    type: String, 
    enum: ['shift', 'bonus', 'achievement', 'promotion', 'warning', 'manual_add', 'manual_remove', 'daily_login', 'overtime', 'admin'],
    required: true 
  },
  reason: { type: String, required: true },
  issuedBy: { type: String },
  balanceAfter: { type: Number },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Transaction', transactionSchema);
