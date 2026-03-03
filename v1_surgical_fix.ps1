$basePath = "C:\Users\Administrator\Desktop\bit\uwu-chan-saas\src\commands\v1"
$files = Get-ChildItem -Path $basePath -Filter "*.js"

foreach ($file in $files) {
    try {
        $content = [System.IO.File]::ReadAllText($file.FullName, [System.Text.Encoding]::UTF8)
        $original = $content

        # 1. Fix Encoding Artifacts
        $content = $content.Replace("ðŸ„", "🔄")
        $content = $content.Replace("ðŸ’Ž", "💎")
        $content = $content.Replace("ðŸ’¡", "💡")
        $content = $content.Replace("ðŸš€", "🚀")
        $content = $content.Replace("ðŸ“ˆ", "📈")
        $content = $content.Replace("ðŸ“ ", "📊")
        $content = $content.Replace("âœ…", "✅")
        $content = $content.Replace("â Œ", "❌")
        $content = $content.Replace("âš ï¸ ", "⚠️")

        # 2. Reconstruct Line 1 Imports Surgically
        # Identify what is used
        $classes = @()
        if ($content -like "*SlashCommandBuilder*") { $classes += "SlashCommandBuilder" }
        if ($content -like "*ActionRowBuilder*") { $classes += "ActionRowBuilder" }
        if ($content -like "*ButtonBuilder*") { $classes += "ButtonBuilder" }
        if ($content -like "*ButtonStyle*") { $classes += "ButtonStyle" }
        if ($content -like "*EmbedBuilder*") { $classes += "EmbedBuilder" }
        if ($content -like "*StringSelectMenuBuilder*") { $classes += "StringSelectMenuBuilder" }
        if ($content -like "*PermissionFlagsBits*") { $classes += "PermissionFlagsBits" }
        if ($content -like "*ComponentType*") { $classes += "ComponentType" }
        if ($content -like "*ChannelSelectMenuBuilder*") { $classes += "ChannelSelectMenuBuilder" }
        if ($content -like "*RoleSelectMenuBuilder*") { $classes += "RoleSelectMenuBuilder" }
        if ($content -like "*ChannelType*") { $classes += "ChannelType" }

        if ($classes.Count -gt 0) {
            $classList = $classes | Select-Object -Unique | Sort-Object | ForEach-Object { $_ }
            $newImport = "const { " + ($classList -join ", ") + " } = require('discord.js');"
            
            # Replace the first line if it looks like a discord.js import
            $lines = $content -split "`r?`n"
            if ($lines[0] -like "*require('discord.js')*") {
                $lines[0] = $newImport
                $content = $lines -join "`r`n"
            }
        }

        if ($content -ne $original) {
            [System.IO.File]::WriteAllText($file.FullName, $content, [System.Text.Encoding]::UTF8)
            Write-Host "🔧 Fixed: $($file.Name)"
        }
    } catch {
        Write-Host "⚠️ Error on $($file.Name): $_"
    }
}

Write-Host "V1 Surgical Fix Complete!"
