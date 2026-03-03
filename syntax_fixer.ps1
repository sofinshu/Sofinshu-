$folders = "v1", "v2", "v3", "v4", "v5", "v6", "v7", "v8"
$basePath = "c:\Users\Administrator\Desktop\bit\uwu-chan-saas\src\commands"

foreach ($folder in $folders) {
    $path = Join-Path $basePath $folder
    if (-not (Test-Path $path)) { continue }
    $files = Get-ChildItem -Path $path -Filter "*.js"
    Write-Host "Repairing syntax in $folder..."

    foreach ($file in $files) {
        $content = Get-Content $file.FullName -Raw
        $original = $content

        # Fix "return const row" and "await const row"
        $content = $content -replace "return const row =", "const row ="
        $content = $content -replace "await const row =", "const row ="
        
        # Double await cleanup
        $content = $content -replace "await await", "await"
        
        # Zenith to Enterprise transition cleanup
        if ($folder -match "v6|v7|v8") {
            $content = $content.Replace("color: 'zenith'", "color: 'enterprise'")
            $content = $content.Replace("auto_zen_", "auto_ent_")
            $content = $content.Replace("Refresh Hyper-Apex Metrics", "Sync Enterprise Data")
        }

        # Fix broken sync button labels (handling diamond emoji artifacts if any)
        $content = $content.Replace(" Sync Enterprise Data", "🔄 Sync Enterprise Data")
        $content = $content.Replace("ðŸ„ Sync Enterprise Data", "🔄 Sync Enterprise Data")

        if ($content -ne $original) {
            Set-Content -Path $file.FullName -Value $content
            Write-Host "✅ Repaired $($file.Name)"
        }
    }
}
Write-Host "Complete!"
