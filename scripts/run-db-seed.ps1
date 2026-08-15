# Load .env.local ke environment lalu jalankan db:seed.
# (tsx tidak auto-load .env.local; Next.js yang biasanya melakukannya.)
# Pola sama persis dengan scripts/run-db-migrate.ps1.
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
& .\node_modules\.bin\tsx.cmd scripts/seed.ts
exit $LASTEXITCODE
