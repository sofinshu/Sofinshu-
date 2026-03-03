const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { Guild } = require('../database/mongo');
const logger = require('../utils/logger');
const { validateGuildId, validatePagination, validateNoSQLInjection } = require('../middleware/validation');

// Rate limiting for guild endpoints
const guildRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({ error: 'Too many requests, please try again later.' });
  }
});

router.use(guildRateLimiter);
router.use(validateNoSQLInjection);

router.get('/:guildId/stats', validateGuildId, async (req, res) => {
  try {
    const guild = await Guild.findOne({ guildId: req.params.guildId });
    if (!guild) return res.status(404).json({ error: 'Guild not found' });

    res.json({
      guildId: guild.guildId,
      name: guild.name,
      stats: guild.stats,
      premium: guild.premium,
      memberCount: guild.memberCount || 0
    });
  } catch (error) {
    logger.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/:guildId/settings', validateGuildId, async (req, res) => {
  try {
    const updates = req.body;
    // Validate that updates is an object
    if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
      return res.status(400).json({ error: 'Settings must be a valid object' });
    }
    const guild = await Guild.findOneAndUpdate(
      { guildId: req.params.guildId },
      { $set: { settings: updates, updatedAt: new Date() } },
      { new: true }
    );

    if (!guild) {
      return res.status(404).json({ error: 'Guild not found' });
    }

    res.json({ success: true, settings: guild.settings });
  } catch (error) {
    logger.error('Error updating guild settings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/', validatePagination, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Maximum limit to prevent resource exhaustion
    const effectiveLimit = Math.min(limit, 100);

    const guilds = await Guild.find()
      .skip(skip)
      .limit(effectiveLimit)
      .select('guildId name premium.tier stats')
      .lean();

    const total = await Guild.countDocuments();

    res.json({
      guilds,
      pagination: {
        page,
        limit: effectiveLimit,
        total,
        pages: Math.ceil(total / effectiveLimit)
      }
    });
  } catch (error) {
    logger.error('Error fetching guilds:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
