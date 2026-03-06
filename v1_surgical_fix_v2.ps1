$basePath = "C:\Users\Administrator\Desktop\bit\uwu-chan-saas\src\commands\v1"
$files = Get-ChildItem -Path $basePath -Filter "*.js"

$fixes = @{
    "ðŸ„" = "🔄";
    "ðŸ’Ž" = "💎";
    "ðŸ’¡" = "💡";
    "ðŸš€" = "🚀";
    "ðŸ“ˆ" = "📈";
    "ðŸ“ " = "📊";
    "âœ…" = "✅";
    "â Œ" = "❌";
    "âš ï¸ " = "⚠️"
}

foreach ($file in $files) {
    try {
        $content = [System.IO.File]::ReadAllText($file.FullName, [System.Text.Encoding]::UTF8)
        $original = $content

        # 1. Fix Encoding
        foreach ($key in $fixes.Keys) {
            $content = $content.Replace($key, $fixes[$key])
        }

        # 2. Fix Imports
        $requiredClasses = @()
        if ($content.Contains("SlashCommandBuilder")) { $requiredClasses += "SlashCommandBuilder" }
        if ($content.Contains("ActionRowBuilder")) { $requiredClasses += "ActionRowBuilder" }
        if ($content.Contains("ButtonBuilder")) { $requiredClasses += "ButtonBuilder" }
        if ($content.Contains("ButtonStyle")) { $requiredClasses += "ButtonStyle" }
        if ($content.Contains("EmbedBuilder")) { $requiredClasses += "EmbedBuilder" }
        if ($content.Contains("StringSelectMenuBuilder")) { $requiredClasses += "StringSelectMenuBuilder" }
        if ($content.Contains("PermissionFlagsBits")) { $requiredClasses += "PermissionFlagsBits" }
        if ($content.Contains("ComponentType")) { $requiredClasses += "ComponentType" }
        if ($content.Contains("ChannelSelectMenuBuilder")) { $requiredClasses += "ChannelSelectMenuBuilder" }
        if ($content.Contains("RoleSelectMenuBuilder")) { $requiredClasses += "RoleSelectMenuBuilder" }
        if ($content.Contains("ChannelType")) { $requiredClasses += "ChannelType" }

        if ($requiredClasses.Count -gt 0) {
            $uniqueClasses = $requiredClasses | Sort-Object -Unique
            $importLine = "const { " + ($uniqueClasses -join ", ") + " } = require('discord.js');"
            
            $lines = $content -split "`r?`n"
            if ($lines[0] -like "*require('discord.js')*") {
                $lines[0] = $importLine
                $content = $lines -join "`r`n"
            }
        }

        if ($content -ne $original) {
            [System.IO.File]::WriteAllText($file.FullName, $content, [System.Text.Encoding]::UTF8)
            Write-Host "✅ Polished: $($file.Name)"
        }
    } catch {
        Write-Host "⚠️ Error on $($file.Name): $_"
    }
}

Write-Host "V1 Final Polish Complete!"
