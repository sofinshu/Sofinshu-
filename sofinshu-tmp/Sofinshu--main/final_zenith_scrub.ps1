$path = "c:\Users\Administrator\Desktop\bit\uwu-chan-saas\src\commands\v8"

$files = Get-ChildItem -Path $path -Filter "*.js"

foreach ($file in $files) {
    try {
        $content = Get-Content $file.FullName -Raw

        # 1. Rename internal command name if it has zenith_
        $content = $content -replace ".setName\('zenith_", ".setName('"
        
        # 2. Strip the word "Zenith" from descriptions and embeds
        $content = $content.Replace("Zenith", "Enterprise")
        $content = $content.Replace("ðŸ’Ž", "👑") # Replace diamond with crown
        
        # 3. Double check imports (in case some files had both)
        if ($content.Contains("createZenithEmbed")) {
             $content = $content.Replace("createZenithEmbed", "createEnterpriseEmbed")
        }

        Set-Content -Path $file.FullName -Value $content
        Write-Host "✅ Final scrub on $($file.Name)"
    } catch {
        Write-Host "❌ Failed on $($file.Name): $_"
    }
}

# Also cleanup embeds.js
$embedsPath = "c:\Users\Administrator\Desktop\bit\uwu-chan-saas\src\utils\embeds.js"
$embedsContent = Get-Content $embedsPath -Raw
$embedsContent = $embedsContent -replace "    zenith: \{ color: '#00fff5', prefix: '💎 ', footer: 'uwu-chan • Zenith Hyper-Apex' \},", ""
$embedsContent = $embedsContent -replace "zenith: '#00fff5',", ""
$embedsContent = $embedsContent -replace "function createZenithEmbed[\s\S]*?\}", ""
$embedsContent = $embedsContent -replace "createZenithEmbed,", ""

Set-Content -Path $embedsPath -Value $embedsContent
Write-Host "✅ Cleaned Zenith from embeds.js"
