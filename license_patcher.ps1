$basePath = "c:\Users\Administrator\Desktop\bit\uwu-chan-saas\src\commands"

$premiumFolders = @("v3", "v4", "v5")
$enterpriseFolders = @("v6", "v7", "v8")

function Patch-Folder($folderName, $tier) {
    $folderPath = Join-Path $basePath $folderName
    if (-Not (Test-Path $folderPath)) { return }
    
    $files = Get-ChildItem -Path $folderPath -Filter "*.js"
    Write-Host "Patching $folderName as $tier ($($files.Count) files)..."
    
    foreach ($file in $files) {
        $content = [System.IO.File]::ReadAllText($file.FullName)
        
        # 1. Ensure Import
        if ($content -notlike "*utils/premium_guard*") {
            $insertPos = $content.IndexOf("require('../../utils/embeds')")
            if ($insertPos -ge 0) {
                $endOfLine = $content.IndexOf(";", $insertPos) + 1
                if ($endOfLine -gt 0) {
                    $importStr = "`nconst { validatePremiumLicense } = require('../../utils/premium_guard');"
                    $content = $content.Insert($endOfLine, $importStr)
                }
            }
        }
        
        # 2. Inject/Update Guard
        # Check if already has a call
        if ($content -like "*validatePremiumLicense(interaction*") {
            # Update to include tier
            $content = $content -replace "validatePremiumLicense\(interaction\)", "validatePremiumLicense(interaction, '$tier')"
        } else {
            # Inject after deferReply
            $deferPos = $content.IndexOf("await interaction.deferReply();")
            if ($deferPos -ge 0) {
                $endOfDefer = $content.IndexOf(";", $deferPos) + 1
                $guardCode = "`n`n            const license = await validatePremiumLicense(interaction, '$tier');`n            if (!license.allowed) {`n                return await interaction.editReply({ embeds: [license.embed], components: [license.components] });`n            }"
                $content = $content.Insert($endOfDefer, $guardCode)
            }
        }
        
        [System.IO.File]::WriteAllText($file.FullName, $content)
    }
}

foreach ($f in $premiumFolders) { Patch-Folder $f "premium" }
foreach ($f in $enterpriseFolders) { Patch-Folder $f "enterprise" }

Write-Host "License Patching Complete!"
