# Load .env.local ke environment lalu jalankan drizzle-kit migrate.
# (drizzle-kit tidak auto-load .env.local; Next.js yang biasanya melakukannya.)
$envFile = Join-Path $PSScriptRoot '..\.env.local'

foreach ($line in Get-Content $envFile) {
    if ($line -match '^\s*([^#=\s][^=]*)=(.*)$') {
        $name = $matches[1].Trim()
        $value = $matches[2].Trim()
        if ($value.StartsWith('"') -and $value.EndsWith('"')) {
            $value = $value.Substring(1, $value.Length - 2)
        }
        Set-Item -Path "Env:$name" -Value $value
    }
}

Set-Location (Join-Path $PSScriptRoot '..')
& node_modules\.bin\drizzle-kit.cmd migrate
exit $LASTEXITCODE
