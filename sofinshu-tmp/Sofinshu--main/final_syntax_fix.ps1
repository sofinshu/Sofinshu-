$basePath = "c:\Users\Administrator\Desktop\bit\uwu-chan-saas\src\commands"
$files = Get-ChildItem -Path $basePath -Filter "*.js" -Recurse

foreach ($file in $files) {
    try {
        $content = [System.IO.File]::ReadAllText($file.FullName)
        $original = $content

        # Direct string replacement for the broken catch structure
        $content = $content.Replace("});🔄else", "}); } else")
        $content = $content.Replace("}); else", "}); } else")

        if ($content -ne $original) {
            [System.IO.File]::WriteAllText($file.FullName, $content)
            Write-Host "Fixed: $($file.Name)"
        }
    } catch {
        Write-Host "Error on $($file.Name): $_"
    }
}
