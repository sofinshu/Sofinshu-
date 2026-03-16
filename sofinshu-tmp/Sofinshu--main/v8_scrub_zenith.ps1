$path = "c:\Users\Administrator\Desktop\bit\uwu-chan-saas\src\commands\v8"

# 1. Rename zenith_passport.js if it exists
$zenithPassport = Join-Path $path "zenith_passport.js"
if (Test-Path $zenithPassport) {
    Rename-Item -Path $zenithPassport -NewName "passport.js"
    Write-Host "Renamed zenith_passport.js to passport.js"
}

# 2. Process all files in v8
$files = Get-ChildItem -Path $path -Filter "*.js"
Write-Host "Scrubbing Zenith branding from $($files.Count) files in v8..."

foreach ($file in $files) {
    try {
        $content = Get-Content $file.FullName -Raw

        # Replace function call
        $content = $content.Replace("createZenithEmbed", "createEnterpriseEmbed")
        
        # Replace sync button label
        $content = $content.Replace("Refresh Hyper-Apex Metrics", "Sync Enterprise Data")
        
        # Replace button customId prefix
        $content = $content.Replace("auto_zen_", "auto_ent_")

        # Strip any hardcoded "Zenith" text in descriptions if I added them
        $content = $content -replace "ðŸ’Ž Zenith Divine Identity Passport â€” complete holographic staff profile", "Enterprise Identity Passport"
        
        Set-Content -Path $file.FullName -Value $content
        Write-Host "✅ Scrubbed Zenith from $($file.Name)"
    } catch {
        Write-Host "❌ Failed on $($file.Name): $_"
    }
}
Write-Host "Complete!"
