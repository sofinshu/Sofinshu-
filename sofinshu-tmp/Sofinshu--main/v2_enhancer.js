const fs = require('fs');
const path = require('path');

const commandsDir = path.join(__dirname, 'src', 'commands', 'v2');

async function processFiles() {
    const files = fs.readdirSync(commandsDir).filter(file => file.endsWith('.js') && file !== 'v2_heatmap.js' && file !== 'v2_shop.js');
    console.log(`Found ${files.length} files to process.`);

    let successCount = 0;
    let failedCount = 0;

    for (const file of files) {
        const filePath = path.join(commandsDir, file);
        try {
            let content = fs.readFileSync(filePath, 'utf8');

            // --- 1. Fix Imports ---
            // Ensure EmbedBuilder and Component Builders are imported
            if (!content.includes('ActionRowBuilder')) {
                content = content.replace(
                    /const \{ (.*?) \} = require\('discord\.js'\);/,
                    (match, p1) => {
                        const parts = p1.split(',').map(s => s.trim());
                        const required = ['SlashCommandBuilder', 'ActionRowBuilder', 'ButtonBuilder', 'ButtonStyle'];
                        required.forEach(r => { if (!parts.includes(r)) parts.push(r); });
                        return `const { ${parts.join(', ')} } = require('discord.js');`;
                    }
                );
            }

            // Ensure custom embed utility is imported
            if (!content.includes('createCustomEmbed')) {
                // Remove native EmbedBuilder destructure if present to force custom embeds
                content = content.replace(/EmbedBuilder(, )?/, '');

                // Add the utility import
                const embedImport = `const { createCustomEmbed, createSuccessEmbed, createErrorEmbed } = require('../../utils/embeds');\n`;
                if (content.includes('const { User')) {
                    content = content.replace(/const \{ User(.*?)\n/, `${embedImport}const { User$1\n`);
                } else {
                    // Just slip it in after discord.js
                    content = content.replace(/require\('discord\.js'\);\n/, `require('discord.js');\n${embedImport}`);
                }
            }


            // --- 2. Force deferReply & EditReply ---
            // Replace `await interaction.reply({` with `await interaction.deferReply();\n await interaction.editReply({`
            // NOTE: This regex is dangerous but works for standard setups. We do a safer targeted approach:

            if (content.includes('interaction.reply({') && !content.includes('deferReply()')) {
                content = content.replace(
                    /async execute\(interaction\) \{(\s*)(?:try \{)?/,
                    `async execute(interaction) {$1try {$1    await interaction.deferReply({ fetchReply: true });\n`
                );

                // Change all standard replies to editReply
                content = content.replace(/interaction\.reply\(\{/g, 'interaction.editReply({');
            }


            // --- 3. Auto-Convert native `new EmbedBuilder()` to `await createCustomEmbed()` ---
            // This is the hardest part. A naive replace:
            content = content.replace(/new EmbedBuilder\(\)/g, `(await createCustomEmbed(interaction, {}))`);

            // Fix color formats (native setColor takes Hex strings, CustomEmbed takes string keys)
            content = content.replace(/\.setColor\(0x[0-9A-Fa-f]+\)/g, `.setColor('primary')`);
            content = content.replace(/\.setColor\('#[0-9A-Fa-f]+'\)/g, `.setColor('primary')`);

            // Inject a generic "Refresh" button at the end of the execute block just before the final editReply if possible
            // We will do a generic regex: if there is an `editReply({ embeds: [embed] })` we add components.
            if (!content.includes('components:')) {
                content = content.replace(/interaction\.editReply\(\{ embeds: \[(.*?)\] \}\);/g,
                    `const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_btn_${file.slice(0, -3)}').setLabel('🔄 Sync / Acknowledge').setStyle(ButtonStyle.Secondary));\n            interaction.editReply({ embeds: [$1], components: [row] });`
                );
            }

            fs.writeFileSync(filePath, content, 'utf8');
            successCount++;
            console.log(`✅ Refactored: ${file}`);

        } catch (err) {
            console.error(`❌ Failed to process ${file}:`, err);
            failedCount++;
        }
    }

    console.log(`\nCompleted! Successful: ${successCount} | Failed: ${failedCount}`);
}

processFiles();
