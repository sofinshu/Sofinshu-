$files = Get-ChildItem -Path "c:\Users\Administrator\Desktop\bit\uwu-chan-saas\src\commands\v2" -Filter "*.js" | Where-Object { $_.Name -ne "v2_heatmap.js" -and $_.Name -ne "v2_shop.js" }

Write-Host "Found $($files.Count) files to enhance..."

foreach ($file in $files) {
    try {
        $content = Get-Content $file.FullName -Raw

        # 1. Fix Imports
        if (-not $content.Contains("ActionRowBuilder")) {
            $content = $content -replace "const \{ (.*?) \} = require\('discord\.js'\);", "const { `$1, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');"
        }
        if (-not $content.Contains("createCustomEmbed")) {
            $content = $content -replace "EmbedBuilder(, )?", ""
            $content = $content -replace "require\('discord\.js'\);", "require('discord.js');`nconst { createCustomEmbed, createSuccessEmbed, createErrorEmbed } = require('../../utils/embeds');"
        }

        # 2. Add deferReply if not present (Simple heuristic)
        if ($content.Contains("interaction.reply({") -and -not $content.Contains("deferReply")) {
            $content = $content -replace "try \{", "try {`n            await interaction.deferReply({ fetchReply: true });"
            $content = $content.Replace("interaction.reply({", "interaction.editReply({")
        }

        # 3. Swap Native EmbedBuilder out for await createCustomEmbed
        $content = $content.Replace("new EmbedBuilder()", "(await createCustomEmbed(interaction, {}))")
        
        # FIX RegExp: powershell uses basic .NET regex. Removing the unescaped - inside brackets.
        $content = $content -replace "\.setColor\('?[#0-9A-Fa-f]+'?\)", ".setColor('primary')"
        $content = $content -replace "\.setColor\(0x[0-9A-Fa-f]+\)", ".setColor('primary')"

        # 4. Inject a Sync Button at the end of the execution block (before final editReply)
        if (-not $content.Contains("ActionRowBuilder().addComponents")) {
            $btnName = $file.BaseName
            $content = $content -replace "interaction\.editReply\(\{ embeds: \[(.*?)\] \}\);", "const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('auto_btn_$btnName').setLabel('🔄 Sync Live Data').setStyle(ButtonStyle.Secondary));`n            await interaction.editReply({ embeds: [`$1], components: [row] });"
        }

        Set-Content -Path $file.FullName -Value $content
        Write-Host "✅ Processed $($file.Name)"
    } catch {
        Write-Host "❌ Failed on $($file.Name): $_"
    }
}
Write-Host "Complete!"
