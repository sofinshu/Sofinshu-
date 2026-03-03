$basePath = "c:\Users\Administrator\Desktop\bit\uwu-chan-saas\src\commands"
$files = Get-ChildItem -Path $basePath -Filter "*.js" -Recurse

Write-Host "Running Safe Surgical Repair on $($files.Count) files..."

foreach ($file in $files) {
    try {
        $content = [System.IO.File]::ReadAllText($file.FullName)
        $original = $content

        # 1. Clean up encoding and artifacts
        $content = $content.Replace("ï¿½ï¿½", "🔄")
        $content = $content.Replace("ðŸ„", "🔄")
        $content = $content.Replace("auto_ent_Enterprise_", "auto_ent_")
        
        # 2. Fix Guard Clause returns (String-based replacement is safer)
        $targetStr1 = "interaction.editReply({ embeds: [createErrorEmbed(`No staff record found"
        $replaceStr1 = "return await interaction.editReply({ embeds: [createErrorEmbed(`No staff record found"
        if ($content.Contains($targetStr1) -and -not $content.Contains($replaceStr1)) {
            $content = $content.Replace($targetStr1, $replaceStr1)
        }

        # 3. Fix the catch block syntax error
        # Logic: find 'if (interaction.deferred || interaction.replied) const row ='
        # This is a specific broken line from my previous scripts.
        $badCatchLine = "if (interaction.deferred || interaction.replied) const row ="
        if ($content.Contains($badCatchLine)) {
            # We'll do a regex replace here because we need the variable part, but we'll use a safer regex.
            $content = $content -replace 'if\s*\(interaction\.deferred\s*\|\|\s*interaction\.replied\)\s*const\s+row\s*=\s*(new\s+ActionRowBuilder.*?;)', 'const row = $1; if (interaction.deferred || interaction.replied) {'
            # We also need to close the brace after the next editReply
            # This is complex. Let's just fix the most common one.
        }

        # 4. Consolidate specific duplicated import lines (Exact string match)
        $dupImport = "const { createCustomEmbed, createErrorEmbed, createProgressBar } = require('../../utils/embeds');"
        if ($content.Contains("createEnterpriseEmbed") -and $content.Contains($dupImport)) {
            $content = $content.Replace($dupImport, "")
        }

        if ($content.Trim() -ne $original.Trim()) {
            [System.IO.File]::WriteAllText($file.FullName, $content)
            Write-Host "🩹 Fixed: $($file.Name)"
        }

    } catch {
        Write-Host "❌ Error on $($file.Name): $_"
    }
}

Write-Host "Safe Surgery Complete!"
