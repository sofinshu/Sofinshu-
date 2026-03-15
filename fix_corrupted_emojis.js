const fs = require('fs');
const path = require('path');

function fixCorruptedEmojis(dir) {
    const files = fs.readdirSync(dir, { recursive: true });
    let fixedCount = 0;

    for (const file of files) {
        if (!file.endsWith('.js')) continue;
        const filePath = path.join(dir, file);
        let content = fs.readFileSync(filePath, 'utf8');
        const original = content;

        content = content.replace(/\uFFFD/g, '•');

        content = content.replace(/• Sync Live Data/g, '🔄 Sync Live Data');
        content = content.replace(/• Sync$/gm, '🔄 Sync');
        content = content.replace(/• Sync /g, '🔄 Sync ');
        
        content = content.replace(/\.setLabel\('• /g, ".setLabel('🔄 ");
        content = content.replace(/setLabel\('•'\)/g, "setLabel('🔄')");
        
        content = content.replace(/const filled = '•'/g, "const filled = '█'");
        content = content.replace(/const empty = '•'/g, "const empty = '░'");
        content = content.replace(/filled = '•'/g, "filled = '█'");
        content = content.replace(/empty = '•'/g, "empty = '░'");
        
        content = content.replace(/'•'.repeat\(/g, "'█'.repeat(");
        content = content.replace(/"•".repeat\(/g, '"█".repeat(');
        content = content.replace(/`'•`.repeat\(/g, "`█`.repeat(");
        
        content = content.replace(/\$'•' \+ /g, "$'█' + ");
        
        content = content.replace(/'•'/g, "'░'");
        
        content = content.replace(/ \| • /g, ' | ');
        content = content.replace(/ • /g, ' • ');
        
        content = content.replace(/‍♂️/g, '👤');
        
        content = content.replace(/�/g, '🔄');

        if (content !== original) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`Fixed: ${filePath}`);
            fixedCount++;
        }
    }

    return fixedCount;
}

console.log('Fixing corrupted emojis in commands...');
const fixed = fixCorruptedEmojis('./src/commands');
console.log(`Total files fixed: ${fixed}`);
