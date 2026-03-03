$v1Dir = "C:\Users\Administrator\Desktop\bit\uwu-chan-saas\src\commands\v1"
$files = Get-ChildItem -Path $v1Dir -Filter *.js

foreach ($file in $files) {
    $content = [System.IO.File]::ReadAllText($file.FullName, [System.Text.Encoding]::UTF8)
    $original = $content

    # 1. Fix Sync Button Emojis (ðŸ„ -> 🔄)
    $content = $content -replace 'ðŸ„', '🔄'

    # 2. Fix Replacement Characters ()
    # [char]0xFFFD is the replacement character
    $rep = [char]0xFFFD
    
    # 3. Handle specific Help.js artifacts
    if ($file.Name -eq "help.js") {
        # Fixing the specific patterns we saw in help.js
        $content = $content -replace "\.setDescription\('\?\? Interactive", ".setDescription('📖 Interactive"
        $content = $content -replace "\.setPlaceholder\('\?\? Browse", ".setPlaceholder('📂 Browse"
        $content = $content -replace "\.setLabel\('\?\? Upgrade", ".setLabel('⭐ Upgrade"
        $content = $content -replace "\.setLabel\('\?\? GitHub", ".setLabel('🔗 GitHub"
        
        # Fixing the category emojis if they are ??
        # CATEGORIES = { general: { emoji: '??' ...
        $content = $content -replace "emoji: '\?\?'", "emoji: '🛠️'" # Generic fallback
        
        # Fix the weird separators - they often show up as '' in the file
        $content = $content.Replace("directory $rep browse", "directory • browse")
        $content = $content.Replace("tier $rep use", "tier • use")
        $content = $content.Replace("categories $rep Type", "categories • Type")
        $content = $content.Replace("name** $rep ", "name** • ")
        $content = $content.Replace("Available', value: ``\?\? ", "Available', value: ``📜 ")
        $content = $content.Replace("Categories', value: ``\?\? ", "Categories', value: ``📁 ")
        $content = $content.Replace("Help $rep Use", "Help • Use")
        $content = $content.Replace("uwu-chan $rep Type", "uwu-chan • Type")
        $content = $content.Replace("uwu-chan Help $rep Use", "uwu-chan Help • Use")
        $content = $content.Replace("Identity $rep V1", "Identity • V1")
    }

    # 4. Handle Staff Profile artifacts
    if ($file.Name -eq "staff_profile.js") {
        # Progress bar chars
        $content = $content.Replace("filled = '$rep'", "filled = '█'")
        $content = $content.Replace("empty = '$rep'", "empty = '░'")
        
        # Emojis and Titles
        $content = $content -replace "title: ``\?\? V1", "title: ``📜 V1"
        $content = $content -replace "description: ``### \?\?\? Macroscopic", "description: ``### 📂 Personnel Registry"
        $content = $content -replace "\*\*\?\? V1 Foundation", "**⭐ V1 Foundation"
        $content = $content -replace "name: '\?\? Identity'", "name: '🆔 Identity'"
        $content = $content -replace "name: '\? Resonance Ribbon'", "name: '📊 Resonance Ribbon'"
        $content = $content -replace "name: '\?\? Authority'", "name: '🎖️ Authority'"
        $content = $content -replace "name: '\?\? Merit Density'", "name: '📈 Merit Density'"
        $content = $content -replace "name: '\?\? Risk Rating'", "name: '⚠️ Risk Rating'"
        $content = $content -replace "name: '\?\?\? Achievements'", "name: '🏆 Achievements'"
        $content = $content -replace "name: '\?\? Omni-Bridge'", "name: '📡 Omni-Bridge'"
        $content = $content.Replace("Identity $rep V1", "Identity • V1")
        $content = $content.Replace("Identity  V1", "Identity • V1")
        $content = $content -replace "\.setLabel\('\?\? Export", ".setLabel('📥 Export"
        $content = $content -replace "content: '\? You don\\'t", "content: '❌ You don\\'t"
        $content = $content -replace "content: '\?\? System Record", "content: '📂 System Record"
        $content = $content -replace "content: '\? An error occurred exporting", "content: '❌ An error occurred exporting"
        $content = $content -replace "map\(t => ``\?\? \${t}``\)", "map(t => ``🏆 \${t}``)"
    }

    if ($content -ne $original) {
        [System.IO.File]::WriteAllText($file.FullName, $content, [System.Text.Encoding]::UTF8)
        Write-Host "Repaired: $($file.Name)"
    }
}
