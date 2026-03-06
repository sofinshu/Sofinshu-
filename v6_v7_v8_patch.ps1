function Process-Folder($path, $tier, $embedFunc, $labelPrefix, $idPrefix) {
    if (-not (Test-Path $path)) { return }
    $files = Get-ChildItem -Path $path -Filter "*.js"
    Write-Host "Found $($files.Count) files in $tier tier ($path)..."

    foreach ($file in $files) {
        try {
            $content = Get-Content $file.FullName -Raw

            # 1. Fix Imports
            if (-not $content.Contains("ActionRowBuilder")) {
                $content = $content -replace "const \{ (.*?) \} = require\('discord\.js'\);", "const { `$1, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');"
            }
            if (-not $content.Contains($embedFunc)) {
                $content = $content -replace "EmbedBuilder(, )?", ""
                $content = $content -replace "require\('discord\.js'\);", "require('discord.js');`nconst { $embedFunc, createSuccessEmbed, createErrorEmbed } = require('../../utils/embeds');"
            }

            # 2. Add deferReply if not present
            if ($content.Contains("interaction.reply({") -and -not $content.Contains("deferReply")) {
                $content = $content -replace "try \{", "try {`n            await interaction.deferReply({ fetchReply: true });"
                $content = $content.Replace("interaction.reply({", "interaction.editReply({")
            }

            # 3. Swap native EmbedBuilder
            $content = $content.Replace("new EmbedBuilder()", "(await $embedFunc(interaction, {}))")

            # 4. Color normalization
            $content = $content -replace "\.setColor\('?[#0-9A-Fa-f]+'?\)", ""
            $content = $content -replace "\.setColor\(0x[0-9A-Fa-f]+\)", ""
            $content = $content -replace "\.setColor\('Random'\)", ""

            # 5. Inject Sync Button
            if (-not $content.Contains("ActionRowBuilder().addComponents")) {
                $btnName = $file.BaseName
                if($content.Contains("interaction.editReply({ embeds: [") -or $content.Contains("interaction.editReply({ embeds:[")) {
                     $content = $content -replace "interaction\.editReply\(\{ embeds: \[(.*?)\] \}\);?", "const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('$idPrefix`_$btnName').setLabel('🔄 $labelPrefix').setStyle(ButtonStyle.Secondary));`n            await interaction.editReply({ embeds: [`$1], components: [row] });"
                }
            }

            Set-Content -Path $file.FullName -Value $content
            Write-Host "✅ Processed $tier $($file.Name)"
        } catch {
            Write-Host "❌ Failed on $($file.Name): $_"
        }
    }
}

# Process V6 & V7 (Enterprise)
Process-Folder "c:\Users\Administrator\Desktop\bit\uwu-chan-saas\src\commands\v6" "Enterprise" "createEnterpriseEmbed" "Sync Enterprise Data" "auto_ent"
Process-Folder "c:\Users\Administrator\Desktop\bit\uwu-chan-saas\src\commands\v7" "Enterprise" "createEnterpriseEmbed" "Sync Enterprise Data" "auto_ent"

# Process V8 (Zenith)
Process-Folder "c:\Users\Administrator\Desktop\bit\uwu-chan-saas\src\commands\v8" "Zenith" "createZenithEmbed" "Refresh Hyper-Apex Metrics" "auto_zen"

Write-Host "Complete!"
