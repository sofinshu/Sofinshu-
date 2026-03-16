$basePath = "c:\Users\Administrator\Desktop\bit\uwu-chan-saas\src\commands"
$commandFiles = Get-ChildItem -Path $basePath -Filter "*.js" -Recurse

Write-Host "Starting Global Audit of $($commandFiles.Count) files..."

foreach ($file in $commandFiles) {
    try {
        $content = [System.IO.File]::ReadAllText($file.FullName)
        $original = $content
        $modified = $false

        # --- 1. Fix Structural Syntax Errors ---
        
        # fix 'return const row =' -> split into two lines
        if ($content -match 'return\s+const\s+row\s*=\s*(new\s+ActionRowBuilder[\s\S]*?);(\s*)(?:await\s+)?(interaction\.editReply)') {
             $content = $content -replace 'return\s+const\s+row\s*=\s*(new\s+ActionRowBuilder[\s\S]*?);(\s*)(?:await\s+)?(interaction\.editReply)', 'const row = $1;$2return await $3'
             $modified = $true
        }

        # fix 'await const row ='
        if ($content -match 'await\s+const\s+row\s*=') {
             $content = $content -replace 'await\s+const\s+row\s*=', 'const row ='
             $modified = $true
        }

        # --- 2. Clean up Imports (Simplified logic to avoid parser issues) ---
        $lines = $content -split "\n"
        $newLines = @()
        $embedImports = @()
        $hasDiscordImport = $false
        
        foreach ($line in $lines) {
            $trimmed = $line.Trim()
            if ($trimmed -match 'require\(.*utils/embeds.*\)') {
                # Extract parts between { and }
                if ($trimmed -match '\{\s*(.*?)\s*\}') {
                    $parts = $matches[1] -split ','
                    foreach ($p in $parts) {
                        $pTrim = $p.Trim()
                        if ($pTrim) { $embedImports += $pTrim }
                    }
                }
                $modified = $true
                continue # Skip this line, we will reconstruct it
            }
            if ($trimmed -match 'require\(.*discord\.js.*\)') {
                $hasDiscordImport = $true
                # Ensure ActionRowBuilder, ButtonBuilder, ButtonStyle are there if needed
                if ($content -match 'new ActionRowBuilder') {
                    if ($trimmed -notmatch 'ActionRowBuilder') {
                         $line = $line -replace '\}', ', ActionRowBuilder }'
                         $modified = $true
                    }
                }
                if ($content -match 'new ButtonBuilder') {
                    if ($trimmed -notmatch 'ButtonBuilder') {
                         $line = $line -replace '\}', ', ButtonBuilder }'
                         $modified = $true
                    }
                }
                if ($content -match 'ButtonStyle') {
                    if ($trimmed -notmatch 'ButtonStyle') {
                         $line = $line -replace '\}', ', ButtonStyle }'
                         $modified = $true
                    }
                }
            }
            $newLines += $line
        }

        if ($embedImports.Count -gt 0) {
            $uniqueImports = $embedImports | Select-Object -Unique | Sort-Object
            $importLine = "const { $($uniqueImports -join ', ') } = require('../../utils/embeds');"
            
            # Re-insert at the top or after discord.js
            $reconstructedLines = @()
            $inserted = $false
            foreach ($line in $newLines) {
                $reconstructedLines += $line
                if ($line -match 'require\(.*discord\.js.*\)' -and -not $inserted) {
                    $reconstructedLines += $importLine
                    $inserted = $true
                }
            }
            if (-not $inserted) {
                $reconstructedLines = @($importLine) + $reconstructedLines
            }
            $content = $reconstructedLines -join "`n"
        } else {
            $content = $newLines -join "`n"
        }

        # --- 3. Final Tier Scrub ---
        if ($file.FullName -match 'v6|v7|v8') {
            $content = $content.Replace("createZenithEmbed", "createEnterpriseEmbed")
            $content = $content.Replace("color: 'zenith'", "color: 'enterprise'")
            $content = $content.Replace("auto_zen_", "auto_ent_")
            $content = $content.Replace("ðŸ’Ž", "👑")
            $content = $content.Replace("ðŸ„", "🔄")
            $content = $content.Replace("Refresh Hyper-Apex Metrics", "Sync Enterprise Data")
        }
        
        $content = $content -replace '(?i)zenith', 'Enterprise'
        $content = $content.Replace("await await", "await")
        $content = $content.Replace("interaction.reply({", "interaction.editReply({")

        # Save if modified
        if ($content.Trim() -ne $original.Trim()) {
            [System.IO.File]::WriteAllText($file.FullName, $content)
            Write-Host "🛠️  Repaired: $($file.Name)"
        }

        # Syntax Check
        $check = node --check $file.FullName 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌  SYNTAX ERROR: $($file.Name)" -ForegroundColor Red
            Write-Host $check -ForegroundColor Yellow
        }

    } catch {
        Write-Host "⚠️  FAILURE on $($file.Name): $_" -ForegroundColor Cyan
    }
}

Write-Host "Audit Complete!"
