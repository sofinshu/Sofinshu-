$v1Dir = "C:\Users\Administrator\Desktop\bit\uwu-chan-saas\src\commands\v1"
$files = Get-ChildItem -Path $v1Dir -Filter *.js

foreach ($file in $files) {
    $content = [System.IO.File]::ReadAllText($file.FullName, [System.Text.Encoding]::UTF8)
    $original = $content

    # Contextual replacements for ?? patterns
    $content = $content -replace "title: '?? Rank Roles Index'", "title: '📜 Rank Roles Index'"
    $content = $content -replace "name: '?? Configuration'", "name: '⚙️ Configuration'"
    $content = $content -replace "title: ``?? \${user.username}'s Rank Progression", "title: ``📈 \${user.username}'s Rank Progression"
    $content = $content -replace "name: '??? Current Rank'", "name: '🎖️ Current Rank'"
    $content = $content -replace "name: '?? Next Tier'", "name: '📊 Next Tier'"
    $content = $content -replace "title: ``?? Server Staff Index", "title: ``👔 Server Staff Index"
    $content = $content -replace "\?\? \*\*Daily Operational Streak:\*\*", "🔥 **Daily Operational Streak:**"
    $content = $content -replace "description: ``Your active duty shift has successfully commenced\.\${streakText}\\n\\n\?\? \*\*Timestamp:\*\*", "description: ``Your active duty shift has successfully commenced.${streakText}\n\n🕒 **Timestamp:**"
    $content = $content -replace "\.setLabel\('?? Pause Shift'\)", ".setLabel('⏸️ Pause Shift')"
    $content = $content -replace "\.setLabel\('?? End Shift'\)", ".setLabel('⏹️ End Shift')"
    $content = $content -replace "\.setDescription\('?? End your current", ".setDescription('⏹️ End your current"
    $content = $content -replace "qualityScore >= 80 \? '?? Excellent' : qualityScore >= 50 \? '?? Good' : '?? Short'", "qualityScore >= 80 ? '🌟 Excellent' : qualityScore >= 50 ? '✅ Good' : '⚠️ Short'"
    $content = $content -replace "title: '?? Shift Complete'", "title: '🏁 Shift Complete'"
    $content = $content -replace "name: '?? Duration'", "name: '⏱️ Duration'"
    $content = $content -replace "name: '?? Shift Quality'", "name: '📊 Shift Quality'"
    $content = $content -replace "name: '?? Ended At'", "name: '🕒 Ended At'"
    $content = $content -replace "\.setLabel\(isResume \? '?? Pause' : '?? Resume'\)", ".setLabel(isResume ? '⏸️ Pause' : '▶️ Resume')"
    $content = $content -replace "title: isResume \? '\? Shift Resumed' : '?? Shift Paused'", "title: isResume ? '▶️ Shift Resumed' : '⏸️ Shift Paused'"
    $content = $content -replace "title: ``?? Protocol Update:", "title: ``📜 Protocol Update:"
    $content = $content -replace "name: '?? Min Shifts'", "name: '⏱️ Min Shifts'"
    $content = $content -replace "name: '?? Consistency'", "name: '📊 Consistency'"
    $content = $content -replace "name: '?? Max Warnings'", "name: '⚠️ Max Warnings'"
    $content = $content -replace "name: '?? achievements'", "name: '🏆 achievements'"
    $content = $content -replace "name: '?? Reputation'", "name: '⭐ Reputation'"
    $content = $content -replace "name: '?? Tenure \(Days\)'", "name: '⏳ Tenure (Days)'"
    $content = $content -replace "title: '?? Rank-Role Binding Updated'", "title: '🔗 Rank-Role Binding Updated'"
    $content = $content -replace "name: '?? Target Rank'", "name: '🎖️ Target Rank'"
    $content = $content -replace "name: '?? Assigned Role'", "name: '🎭 Assigned Role'"
    $content = $content -replace "title: ``?? Operational Summary:", "title: ``📊 Operational Summary:"
    $content = $content -replace "name: '?? Active Personnel'", "name: '👥 Active Personnel'"
    $content = $content -replace "name: '?? Total Active Hours'", "name: '⏱️ Total Active Hours'"
    $content = $content -replace "name: '?? Total Incidents'", "name: '⚠️ Total Incidents'"
    $content = $content -replace "name: '?? Event Logs'", "name: '📜 Event Logs'"
    $content = $content -replace "name: '?? Member Count'", "name: '📈 Member Count'"
    $content = $content -replace "title: '?? Terminal Operational Summary \(Daily\)'", "title: '📊 Terminal Operational Summary (Daily)'"
    $content = $content -replace "name: '?? Total Active Time'", "name: '⏱️ Total Active Time'"
    
    # Generic replacements for remaining ?? patterns
    $content = $content -replace "?? ", "🔹 "
    $content = $content -replace "??", "🔹"
    
    # Fix the weird  character if it still exists outside help/staff_profile
    $rep = [char]0xFFFD
    $content = $content.Replace("$rep", "•")

    if ($content -ne $original) {
        [System.IO.File]::WriteAllText($file.FullName, $content, [System.Text.Encoding]::UTF8)
        Write-Host "Polished: $($file.Name)"
    }
}
