$basePath = "c:\Users\Administrator\Desktop\bit\uwu-chan-saas\src\commands"
$files = Get-ChildItem -Path $basePath -Filter "*.js" -Recurse

Write-Host "Deep-scrubbing $($files.Count) files..."

foreach ($file in $files) {
    try {
        # Read with UTF8 encoding explicitly
        $content = [System.IO.File]::ReadAllText($file.FullName, [System.Text.Encoding]::UTF8)
        $original = $content

        # 1. Purge all weird "🔄" symbols and other non-ASCII artifacts that aren't emojis
        # This replaces the specific 🔄 artifact with a space
        $content = $content.Replace("🔄", " ")
        
        # 2. Fix the broken catch block logic globally
        # We look for the literal $2 placeholder and replace it with proper error handling
        # This covers cases where the ternary or if/else was smashed onto one line
        $regexSource = 'if\s*\(interaction\.deferred\s*\|\|\s*interaction\.replied\)\s*await\s+interaction\.editReply\(\{\$2\}\);\s*\}\s*else\s+await'
        $replacement = 'if (interaction.deferred || interaction.replied) { return await interaction.editReply({ embeds: [errEmbed], components: [row] }); } else await'
        $content = $content -replace $regexSource, $replacement

        # 3. Handle cases where it's already partly fixed but missing braces
        $content = $content -replace 'editReply\(\{\$2\}\)', 'editReply({ embeds: [errEmbed], components: [row] })'
        
        # 4. Final safety check for missing braces before else
        $content = $content -replace '\);\s*else\s+await', '); } else await'
        
        # 5. Fix double returns if any remain
        $content = $content.Replace("return return await", "return await")

        if ($content -ne $original) {
            [System.IO.File]::WriteAllText($file.FullName, $content, [System.Text.Encoding]::UTF8)
            Write-Host "✨ Scrubbed: $($file.Name)"
        }
    } catch {
        Write-Host "⚠️ Error on $($file.Name): $_"
    }
}

Write-Host "Deep Scrub Complete!"
