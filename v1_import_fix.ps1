$basePath = "C:\Users\Administrator\Desktop\bit\uwu-chan-saas\src\commands\v1"
$files = Get-ChildItem -Path $basePath -Filter "*.js"

foreach ($file in $files) {
    try {
        $content = [System.IO.File]::ReadAllText($file.FullName, [System.Text.Encoding]::UTF8)
        $original = $content

        # Fix imports if line 1 contains discord.js
        if ($content -match "require\('discord.js'\)") {
            $classes = [System.Collections.Generic.List[string]]::new()
            
            $usedClasses = @("SlashCommandBuilder", "ActionRowBuilder", "ButtonBuilder", "ButtonStyle", "EmbedBuilder", "StringSelectMenuBuilder", "PermissionFlagsBits", "ComponentType", "ChannelSelectMenuBuilder", "RoleSelectMenuBuilder", "ChannelType")
            foreach ($c in $usedClasses) {
                if ($content -match $c) { $classes.Add($c) }
            }

            if ($classes.Count -gt 0) {
                $unique = $classes | Sort-Object -Unique
                $newList = $unique -join ", "
                $newImport = "const { $newList } = require('discord.js');"
                
                # Replace the first line if it's a discord.js import
                $lines = $content -split "`r?`n"
                if ($lines[0] -match "require\('discord.js'\)") {
                    $lines[0] = $newImport
                    $content = $lines -join "`r`n"
                }
            }
        }

        if ($content -ne $original) {
            [System.IO.File]::WriteAllText($file.FullName, $content, [System.Text.Encoding]::UTF8)
            Write-Host "Polished: $($file.Name)"
        }
    } catch {
        Write-Host "Error on $($file.Name): $_"
    }
}
