$basePath = "C:\Users\Administrator\Desktop\bit\uwu-chan-saas\src\commands\v1"
$files = Get-ChildItem -Path $basePath -Filter "*.js"

foreach ($file in $files) {
    $content = [System.IO.File]::ReadAllText($file.FullName, [System.Text.Encoding]::UTF8)
    $original = $content

    $content = $content.Replace("ðŸ„", "🔄")
    $content = $content.Replace("ðŸ’Ž", "💎")
    $content = $content.Replace("ðŸ’¡", "💡")
    $content = $content.Replace("ðŸš€", "🚀")
    $content = $content.Replace("ðŸ“ˆ", "📈")
    $content = $content.Replace("ðŸ“ ", "📊")
    $content = $content.Replace("âœ…", "✅")
    $content = $content.Replace("â Œ", "❌")
    $content = $content.Replace("âš ï¸ ", "⚠️")

    if ($content -ne $original) {
        [System.IO.File]::WriteAllText($file.FullName, $content, [System.Text.Encoding]::UTF8)
        Write-Host "✅ Fixed: $($file.Name)"
    }
}

Write-Host "V1 Emoji Fix Complete!"
