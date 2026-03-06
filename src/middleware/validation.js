/**
 * validation.js
 * ──────────────────────────────────────────────────────────────────
 * Input validation middleware for API routes
 * Prevents NoSQL injection and validates request inputs
 * ──────────────────────────────────────────────────────────────────
 */

'use strict';

const logger = require('../utils/logger');

// MongoDB operator patterns to prevent NoSQL injection
const PROHIBITED_PATTERNS = [
    /\$where/i,
    /\$ne/i,
    /\$eq/i,
    /\$gt/i,
    /\$gte/i,
    /\$lt/i,
    /\$lte/i,
    /\$in/i,
    /\$nin/i,
    /\$regex/i,
    /\$options/i,
    /\$or/i,
    /\$and/i,
    /\$not/i,
    /\$nor/i,
    /\$exists/i,
    /\$type/i,
    /\$mod/i,
    /\$text/i,
    /\$search/i,
    /\$language/i,
    /\$caseSensitive/i,
    /\$diacriticSensitive/i
];

/**
 * Validates a string value for MongoDB injection attempts
 * @param {*} value - Value to validate
 * @returns {boolean} - True if safe, false if potentially malicious
 */
function isSafeValue(value) {
    if (typeof value !== 'string') return true;
    return !PROHIBITED_PATTERNS.some(pattern => pattern.test(value));
}

/**
 * Recursively checks an object for MongoDB operators
 * @param {*} obj - Object to check
 * @returns {boolean} - True if safe, false if contains operators
 */
function checkObject(obj) {
    if (typeof obj !== 'object' || obj === null) {
        return isSafeValue(obj);
    }

    for (const key of Object.keys(obj)) {
        // Check if key starts with $ (MongoDB operator)
        if (key.startsWith('$')) {
            return false;
        }
        // Recursively check nested objects
        if (!checkObject(obj[key])) {
            return false;
        }
    }
    return true;
}

/**
 * Sanitizes user input by removing potentially dangerous characters
 * @param {string} input - Input string to sanitize
 * @returns {string} - Sanitized string
 */
function sanitizeString(input) {
    if (typeof input !== 'string') return input;
    return input
        .replace(/[<>]/g, '') // Remove < and > to prevent HTML injection
        .trim();
}

/**
 * Validates that a value is a valid Discord ID (snowflake)
 * @param {*} id - ID to validate
 * @returns {boolean}
 */
function isValidDiscordId(id) {
    if (typeof id !== 'string' && typeof id !== 'number') return false;
    const idStr = String(id);
    // Discord IDs are 17-20 digit numbers
    return /^\d{17,20}$/.test(idStr);
}

/**
 * Validates that a value is a valid hex color code
 * @param {*} color - Color to validate
 * @returns {boolean}
 */
function isValidHexColor(color) {
    if (typeof color !== 'string') return false;
    return /^#[0-9A-Fa-f]{6}$/.test(color);
}

/**
 * Express middleware to validate request body for NoSQL injection
 */
function validateNoSQLInjection(req, res, next) {
    const checkValue = (value, path) => {
        if (typeof value === 'string') {
            if (!isSafeValue(value)) {
                logger.warn(`Potential NoSQL injection detected at ${path}: ${value.substring(0, 100)}`);
                return false;
            }
        } else if (typeof value === 'object' && value !== null) {
            if (!checkObject(value)) {
                logger.warn(`Potential NoSQL injection detected in object at ${path}`);
                return false;
            }
        }
        return true;
    };

    // Check body
    if (req.body && typeof req.body === 'object') {
        if (!checkObject(req.body)) {
            return res.status(400).json({ error: 'Invalid input detected' });
        }
    }

    // Check query parameters
    if (req.query && typeof req.query === 'object') {
        if (!checkObject(req.query)) {
            return res.status(400).json({ error: 'Invalid query parameters detected' });
        }
    }

    // Check URL parameters
    if (req.params && typeof req.params === 'object') {
        for (const [key, value] of Object.entries(req.params)) {
            if (typeof value === 'string' && !isSafeValue(value)) {
                logger.warn(`Potential NoSQL injection in URL param ${key}: ${value.substring(0, 100)}`);
                return res.status(400).json({ error: 'Invalid URL parameter detected' });
            }
        }
    }

    next();
}

/**
 * Express middleware to validate guildId parameter
 */
function validateGuildId(req, res, next) {
    const guildId = req.params.guildId;
    if (!guildId) {
        return res.status(400).json({ error: 'Guild ID is required' });
    }
    if (!isValidDiscordId(guildId)) {
        logger.warn(`Invalid guildId format: ${guildId}`);
        return res.status(400).json({ error: 'Invalid Guild ID format' });
    }
    next();
}

/**
 * Express middleware to validate userId parameter
 */
function validateUserId(req, res, next) {
    const userId = req.params.userId;
    if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
    }
    if (!isValidDiscordId(userId)) {
        logger.warn(`Invalid userId format: ${userId}`);
        return res.status(400).json({ error: 'Invalid User ID format' });
    }
    next();
}

/**
 * Express middleware to validate pagination parameters
 */
function validatePagination(req, res, next) {
    const page = parseInt(req.query.page);
    const limit = parseInt(req.query.limit);

    if (req.query.page && (isNaN(page) || page < 1)) {
        return res.status(400).json({ error: 'Invalid page parameter' });
    }
    if (req.query.limit && (isNaN(limit) || limit < 1 || limit > 100)) {
        return res.status(400).json({ error: 'Invalid limit parameter (must be 1-100)' });
    }

    next();
}

module.exports = {
    validateNoSQLInjection,
    validateGuildId,
    validateUserId,
    validatePagination,
    isValidDiscordId,
    isValidHexColor,
    sanitizeString,
    isSafeValue
};
