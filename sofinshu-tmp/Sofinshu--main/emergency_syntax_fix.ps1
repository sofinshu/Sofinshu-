$basePath = "c:\Users\Administrator\Desktop\bit\uwu-chan-saas\src\commands"
$files = Get-ChildItem -Path $basePath -Filter "*.js" -Recurse

foreach ($file in $files) {
    try {
        $content = [System.IO.File]::ReadAllText($file.FullName)
        $original = $content

        # 1. Fix double returns
        $content = $content.Replace("return return await", "return await")
        
        # 2. Fix placeholders and missing braces
        # We need to be careful with the exact string injected
        $content = $content.Replace("await interaction.editReply({$2}); } else", "await interaction.editReply({ embeds: [errEmbed], components: [row] }); } else")
        $content = $content.Replace("await interaction.editReply({$2});} else", "await interaction.editReply({ embeds: [errEmbed], components: [row] }); } else")
        
        # Fix cases where only part of the regex worked
        $content = $content.Replace("editReply({$2})", "editReply({ embeds: [errEmbed], components: [row] })")

        if ($content -ne $original) {
            [System.IO.File]::WriteAllText($file.FullName, $content)
            Write-Host "Fixed: $($file.Name)"
        }
    } catch {
        Write-Host "Error on $($file.Name): $_"
    }
}
