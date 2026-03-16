$basePath = "c:\Users\Administrator\Desktop\bit\uwu-chan-saas\src\commands"
$files = Get-ChildItem -Path $basePath -Filter "*.js" -Recurse

Write-Host "Repairing catch block syntax in $($files.Count) files..."

foreach ($file in $files) {
    $content = [System.IO.File]::ReadAllText($file.FullName)
    $original = $content
    
    # Fix the missing } before else in the catch block pattern
    # Pattern: if (interaction.deferred || interaction.replied) { ... await interaction.editReply(...); else await ...
    $content = $content -replace 'if\s*\(interaction\.deferred\s*\|\|\s*interaction\.replied\)\s*\{\s*(return\s+)?await\s+interaction\.editReply\(\{.*?\}\);\s*else\s+await', 'if (interaction.deferred || interaction.replied) { $1await interaction.editReply({$2}); } else await'
    
    # Safer approach if the above is too specific: 
    # Look for cases where an 'else' follows a line that ends with ');' but has no '}'
    $content = $content -replace 'interaction\.editReply\(\{.*?\}\);\s*else', 'interaction.editReply({$2}); } else'
    
    # Also clean up the double semicolons or weird line joins
    $content = $content -replace ';\s*if\s*\(interaction\.deferred', ";`n            if (interaction.deferred"
    
    # Ensure braces are balanced in the catch block
    # This is harder via regex, but let's fix the most common one:
    $content = $content.Replace("}); else", "}); } else")
    $content = $content.Replace("});else", "}); } else")

    if ($content -ne $original) {
        [System.IO.File]::WriteAllText($file.FullName, $content)
        Write-Host "✅ Fixed: $($file.Name)"
    }
}

Write-Host "Syntax Repair Complete!"
