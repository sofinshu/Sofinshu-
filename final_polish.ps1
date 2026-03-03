$basePath = "c:\Users\Administrator\Desktop\bit\uwu-chan-saas\src\commands"
$files = Get-ChildItem -Path $basePath -Filter "*.js" -Recurse

Write-Host "Running Final Polish on $($files.Count) files..."

foreach ($file in $files) {
    try {
        $content = [System.IO.File]::ReadAllText($file.FullName)
        $original = $content
        
        # 1. Formatting and Syntax cleanup
        $content = $content.Replace("));; if", "); if")
        $content = $content.Replace("auto_ent_Enterprise_", "auto_ent_")
        
        # 2. Encoding Cleanup (All known variations of the broken Sync icon)
        $content = $content.Replace("ï¿½ Sync", "🔄 Sync")
        $content = $content.Replace("ï¿½ï¿½ Sync", "🔄 Sync")
        $content = $content.Replace("ðŸ„ Sync", "🔄 Sync")
        $content = $content.Replace("ðŸ„", "🔄")
        $content = $content.Replace("ï¿½", "🔄")
        
        # 3. Guard Clause Alignment (Case insensitive check)
        $content = $content -replace "interaction\.editReply\(\{ embeds: \[errEmbed\], components: \[row\] \}\);", "return await interaction.editReply({ embeds: [errEmbed], components: [row] });"
        $content = $content -replace "interaction\.editReply\(\{ embeds: \[license\.embed\], components: license\.components \}\);", "return await interaction.editReply({ embeds: [license.embed], components: license.components });"

        # 4. Double Await cleanup
        $content = $content.Replace("await await", "await")
        $content = $content.Replace("return await await", "return await")
        
        # 5. ID Fixes (Zenith leftovers)
        $content = $content -replace "auto_zen_", "auto_ent_"

        if ($content.Trim() -ne $original.Trim()) {
            [System.IO.File]::WriteAllText($file.FullName, $content)
            Write-Host "✨ Polished: $($file.Name)"
        }
    } catch {
        Write-Host "⚠️ Error on $($file.Name): $_"
    }
}

Write-Host "Final Polish Complete!"
