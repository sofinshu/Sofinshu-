$basePath = "C:\Users\Administrator\Desktop\bit\uwu-chan-saas\src\commands\v1"
$files = Get-ChildItem -Path $basePath -Filter "*.js"

Write-Host "Reconstructing $($files.Count) V1 commands..."

foreach ($file in $files) {
    try {
        $content = [System.IO.File]::ReadAllText($file.FullName, [System.Text.Encoding]::UTF8)
        $original = $content

        # 1. Remove impossible statements
        $content = $content.Replace("await return await", "return await")
        $content = $content.Replace("return return await", "return await")

        # 2. Purge regex artifacts (comma-separated import snippets)
        $content = $content -replace ',\s*ActionRowBuilder\s*,\s*ButtonBuilder\s*,\s*ButtonStyle', ''
        
        # 3. Standardize Branding to "Free Tier" or "Foundation"
        $content = $content -replace "Enterprise Hyper-Apex", "V1 Foundation"
        $content = $content -replace "Enterprise Analytics", "Foundation Analytics"
        $content = $content -replace "Macroscopic Peak Intensity", "Standard Intensity"
        $content = $content -replace "Macroscopic Signal Intensity", "Signal Intensity"
        $content = $content -replace "Enterprise Activity Chart", "V1 Activity Chart"
        $content = $content -replace "HYPER-APEX EXCLUSIVE", "FREE TIER SUITE"
        $content = $content -replace "Enterprise HYPER-APEX", "V1 Foundation"
        $content = $content -replace "color:\s*'premium'", "color: 'primary'"
        $content = $content -replace "Macroscopic Status", "Server Status"
        $content = $content -replace "V2 APEX", "V1 Foundation"
        
        # 4. Standardize Sync Buttons
        $content = $content -replace ".setLabel\('\s*Sync Live Data'\)", ".setLabel('🔄 Sync Live Data')"
        $content = $content -replace ".setLabel\('\s*Refresh'\)", ".setLabel('🔄 Refresh')"
        
        # 5. Fix catch block syntax (missing braces/improper returns)
        # Handle cases where deferReply was missing a closing brace before else
        $content = $content -replace '(?s)(\.editReply\(.*?\);)\s*else\s+await', '$1 } else await'
        
        # Fix the specific pattern: await interaction.editReply({ embeds: [errEmbed] }); } else await
        # Ensure it has return if inside an async function that needs it (not strictly required for Discord.js execute but cleaner)
        
        if ($content -ne $original) {
            [System.IO.File]::WriteAllText($file.FullName, $content, [System.Text.Encoding]::UTF8)
            Write-Host "✅ Reconstructed: $($file.Name)"
        }
    } catch {
        Write-Host "⚠️ Error on $($file.Name): $_"
    }
}

Write-Host "V1 Reconstruction Complete!"
