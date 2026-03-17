// permissionMiddleware.js

/**
 * Middleware for dynamic permission checking based on user tier.
 * Supports both Express.js and Discord.js v14 integration.
 */

const db = require('../path/to/database'); // Update with actual path to your database connection

async function checkPermissions(userId, command) {
    // Fetch user tier from the database
    const user = await db.getUserById(userId);
    if (!user) {
        throw new Error('User not found');
    }

    // Implement your permission logic here based on user tier
    const permissions = {
        admin: ['command1', 'command2', 'command3'],
        moderator: ['command1', 'command2'],
        user: ['command1'],
    };

    return permissions[user.tier].includes(command);
}

// Express.js middleware
function expressPermissionMiddleware(command) {
    return async (req, res, next) => {
        try {
            const hasPermission = await checkPermissions(req.user.id, command);
            if (!hasPermission) {
                return res.status(403).send('Forbidden');
            }
            next();
        } catch (error) {
            console.error(error);
            return res.status(500).send('Internal Server Error');
        }
    };
}

// Discord.js command permission check
async function discordPermissionCheck(interaction, command) {
    try {
        const hasPermission = await checkPermissions(interaction.user.id, command);
        if (!hasPermission) {
            return await interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
        }
    } catch (error) {
        console.error(error);
    }
}

module.exports = { expressPermissionMiddleware, discordPermissionCheck };