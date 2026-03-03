const fs = require('fs');
const path = require('path');

const v1Dir = path.join(__dirname, 'src', 'commands', 'v1');

const files = fs.readdirSync(v1Dir).filter(f => f.endsWith('.js'));

files.forEach(file => {
    const filePath = path.join(v1Dir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;

    // 1. Fix Sync Button Emojis (ðŸ„ -> 🔄)
    if (content.includes('ðŸ„')) {
        content = content.replace(/ðŸ„/g, '🔄');
        changed = true;
    }

    // 2. Fix Replacement Characters (\uFFFD)
    // Often shows up as  in logs or just broken boxes
    const replacementChar = /\uFFFD/g;
    if (replacementChar.test(content)) {
        // In most V1 contexts, these are either separators (•) or progress bar chars (█/░)
        // We'll handle them contextually if possible, otherwise generic fix
        content = content.replace(/\uFFFD\uFFFD/g, '🔄'); // Sometimes double ?? represents an emoji
        changed = true;
    }

    // 3. Handle specific Help.js artifacts
    if (file === 'help.js') {
        content = content.replace(/emoji: '\?\?'/g, (match, offset) => {
            // Logic based on category if we wanted to be fancy, 
            // but let's just use generic high-quality placeholders if we can't tell
            return match;
        });
        // Fixing the specific patterns we saw in help.js
        content = content.replace(/\.setDescription\('\?\? Interactive/g, ".setDescription('📖 Interactive");
        content = content.replace(/\.setPlaceholder\('\?\? Browse/g, ".setPlaceholder('📂 Browse");
        content = content.replace(/\.setLabel\('\?\? Upgrade/g, ".setLabel('⭐ Upgrade");
        content = content.replace(/\.setLabel\('\?\? GitHub/g, ".setLabel('🔗 GitHub");

        // Fix the weird "browse all available features" separator
        content = content.replace(/directory \ufffd browse/g, "directory • browse");
        content = content.replace(/tier \ufffd use/g, "tier • use");
        content = content.replace(/categories \ufffd Type/g, "categories • Type");
        content = content.replace(/name\*\* \ufffd /g, "name** • ");
        content = content.replace(/Available', value: `\?\? /g, "Available', value: `📜 ");
        content = content.replace(/Categories', value: `\?\? /g, "Categories', value: `📁 ");
        content = content.replace(/Help \ufffd Use/g, "Help • Use");
        changed = true;
    }

    // 4. Handle Staff Profile artifacts
    if (file === 'staff_profile.js') {
        // Progress bar
        content = content.replace(/filled = '\ufffd'/g, "filled = '█'");
        content = content.replace(/empty = '\ufffd'/g, "empty = '░'");

        // Emojis
        content = content.replace(/title: `\?\? V1/g, "title: `📜 V1");
        content = content.replace(/description: `### \?\?\? Macroscopic/g, "description: `### 📂 Personnel Registry");
        content = content.replace(/\*\*\?\? V1 Foundation/g, "**⭐ V1 Foundation");
        content = content.replace(/name: '\?\? Identity'/g, "name: '🆔 Identity'");
        content = content.replace(/name: '\? Resonance Ribbon'/g, "name: '📊 Resonance Ribbon'");
        content = content.replace(/name: '\?\? Authority'/g, "name: '🎖️ Authority'");
        content = content.replace(/name: '\?\? Merit Density'/g, "name: '📈 Merit Density'");
        content = content.replace(/name: '\?\? Risk Rating'/g, "name: '⚠️ Risk Rating'");
        content = content.replace(/name: '\?\?\? Achievements'/g, "name: '🏆 Achievements'");
        content = content.replace(/name: '\?\? Omni-Bridge'/g, "name: '📡 Omni-Bridge'");
        content = content.replace(/footer: 'Blockchain-verified Operational Identity \uffFD V1/g, "footer: 'Blockchain-verified Operational Identity • V1");
        content = content.replace(/\.setLabel\('\?\? Export/g, ".setLabel('📥 Export");
        content = content.replace(/content: '\? You don\\'t/g, "content: '❌ You don\\'t");
        content = content.replace(/content: '\?\? System Record/g, "content: '📂 System Record");
        content = content.replace(/content: '\? An error occurred exporting/g, "content: '❌ An error occurred exporting");
        content = content.replace(/map\(t => `\?\? \${t}`\)/g, "map(t => `🏆 ${t}`)");
        changed = true;
    }

    if (changed) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Repaired: ${file}`);
    }
});
