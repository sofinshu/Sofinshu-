const fs = require('fs');
const path = require('path');

function walk(dir) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            walk(filePath);
        } else if (file.endsWith('.js')) {
            let content = fs.readFileSync(filePath, 'utf8');
            const original = content;

            // This is the problematic character that looks like a circular arrow/sync icon
            // It might be corrupted UTF-8. We replace it with a standard space if it's the specific artifact.
            // Based on previous tool outputs, it was often represented as 🔄.

            // Replace common corruption patterns
            content = content.replace(/🔄/g, ' ');
            content = content.replace(/ï¿½/g, ' ');

            // Ensure the Sync icon is clean
            content = content.replace(/🔄 Sync/g, '🔄 Sync');

            // Fix double returns
            content = content.replace(/return return await/g, 'return await');

            if (content !== original) {
                fs.writeFileSync(filePath, content, 'utf8');
                console.log(`Cleaned: ${file}`);
            }
        }
    });
}

walk('./src/commands');
console.log('Encoding Cleanup Complete!');
