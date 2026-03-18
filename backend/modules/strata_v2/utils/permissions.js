const Guild = require('../models/Guild');

/**
 * Check if user has manager permissions for STRATA commands
 */
async function isManager(member, guildDoc) {
  if (!member || !guildDoc) return false;
  if (member.permissions.has('Administrator')) return true;
  const managerRoles = guildDoc.roles?.managers || [];
  return member.roles.cache.some(r => managerRoles.includes(r.id));
}

/**
 * Check if user is registered staff
 */
async function isStaff(member, guildDoc) {
  if (!member || !guildDoc) return false;
  if (await isManager(member, guildDoc)) return true;
  const staffRoles = guildDoc.roles?.staff || [];
  return member.roles.cache.some(r => staffRoles.includes(r.id));
}

/**
 * Get or create guild document
 */
async function getOrCreateGuild(guildId, guildName) {
  let guild = await Guild.findOne({ guildId });
  if (!guild) {
    guild = await Guild.create({ guildId, name: guildName });
  }
  return guild;
}

/**
 * Check guild tier
 */
function hasTier(guildDoc, required) {
  const tiers = { free: 0, premium: 1, enterprise: 2 };
  const current = tiers[guildDoc?.tier || 'free'];
  const req = tiers[required] ?? 0;
  return current >= req;
}

module.exports = { isManager, isStaff, getOrCreateGuild, hasTier };
