$files = Get-ChildItem -Path "c:\Users\Administrator\Desktop\bit\uwu-chan-saas\src\commands\v3" -Filter "*.js"

Write-Host "Found $($files.Count) files in v3 to enhance..."

foreach ($file in $files) {
    try {
        $content = Get-Content $file.FullName -Raw

        # 1. Fix Imports
        if (-not $content.Contains("ActionRowBuilder")) {
            $content = $content -replace "const \{ (.*?) \} = require\('discord\.js'\);", "const { `$1, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');"
        }
        if (-not $content.Contains("createPremiumEmbed")) {
            $content = $content -replace "EmbedBuilder(, )?", ""
            $content = $content -replace "require\('discord\.js'\);", "require('discord.js');`nconst { createPremiumEmbed, createSuccessEmbed, createErrorEmbed } = require('../../utils/embeds');"
        }

        # 2. Add deferReply if not present (Simple heuristic)
        if ($content.Contains("interaction.reply({") -and -not $content.Contains("deferReply")) {
            $content = $content -replace "try \{", "try {`n            await interaction.deferReply({ fetchReply: true });"
            $content = $content.Replace("interaction.reply({", "interaction.editReply({")
        }

        # 3. Swap Native EmbedBuilder out for await createPremiumEmbed
        $content = $content.Replace("new EmbedBuilder()", "(await createPremiumEmbed(interaction, {}))")
        
        # 4. Color normalization (Strip setColor since createPremiumEmbed applies the premium pink color by default)
        $content = $content -replace "\.setColor\('?[#0-9A-Fa-f]+'?\)", ""
        $content = $content -replace "\.setColor\(0x[0-9A-Fa-f]+\)", ""
        $content = $content -replace "\.setColor\('Random'\)", ""
        $content = $content -replace "\.setColor\('.*?'\)", ""

        # 5. Inject a Sync Button at the end of the execution block
        if (-not $content.Contains("ActionRowBuilder().addComponents")) {
            $btnName = $file.BaseName
            if($content.Contains("interaction.editReply({ embeds: [") -or $content.Contains("interaction.editReply({ embeds:[")) {
                 $content = $content -replace "interaction\.editReply\(\{ embeds: \[(.*?)\] \}\);?", "const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_v3_$btnName').setLabel('🔄 Sync Live Data').setStyle(ButtonStyle.Secondary));`n            await interaction.editReply({ embeds: [`$1], components: [row] });"
            }
        }

        Set-Content -Path $file.FullName -Value $content
        Write-Host "✅ Processed v3 $($file.Name)"
    } catch {
        Write-Host "❌ Failed on $($file.Name): $_"
    }
}
Write-Host "Complete!"
